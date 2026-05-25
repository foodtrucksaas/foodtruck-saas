import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyWebhookSignature, recordWebhookEvent } from '../_shared/stripe.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

serve(async (req) => {
  // Webhooks are POST only, no CORS needed (Stripe server-to-server)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Read raw body BEFORE any JSON parsing (required for signature verification)
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
      });
    }

    // Verify signature
    let event;
    try {
      event = await verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
      });
    }

    // Idempotence check
    const isNew = await recordWebhookEvent(event.id, event.type);
    if (!isNew) {
      console.log(`Webhook event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, deduplicated: true }), {
        status: 200,
      });
    }

    const supabase = createSupabaseAdmin();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as {
          id: string;
          customer: string;
          status: string;
          current_period_start?: number;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
          canceled_at?: number | null;
          metadata?: { foodtruck_id?: string };
        };

        // Map Stripe status to our status
        const statusMap: Record<string, string> = {
          trialing: 'trialing',
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'unpaid',
          incomplete: 'incomplete',
          incomplete_expired: 'canceled',
          paused: 'paused',
        };
        const mappedStatus = statusMap[sub.status] || 'incomplete';

        const toISO = (ts: number | null | undefined): string | null =>
          ts ? new Date(ts * 1000).toISOString() : null;

        const updateData = {
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
          status: mappedStatus,
          current_period_start: toISO(sub.current_period_start),
          current_period_end: toISO(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          canceled_at: toISO(sub.canceled_at),
          updated_at: new Date().toISOString(),
        };

        // Try to update by stripe_subscription_id first
        const { data: updated, error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', sub.id)
          .select('id');

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          break;
        }

        // If no row was updated, try by stripe_customer_id (first checkout)
        if (!updated || updated.length === 0) {
          const customerId = typeof sub.customer === 'string' ? sub.customer : null;
          if (customerId) {
            const { error: fallbackError } = await supabase
              .from('subscriptions')
              .update(updateData)
              .eq('stripe_customer_id', customerId);

            if (fallbackError) {
              console.error('Error updating subscription by customer_id:', fallbackError);
            }
          }
        }

        console.log(`Subscription ${sub.id} updated to status: ${mappedStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) console.error('Error canceling subscription:', error);
        else console.log(`Subscription ${sub.id} canceled`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription: string | null };
        if (invoice.subscription) {
          // If subscription was past_due, set back to active
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)
            .eq('status', 'past_due');

          if (error) console.error('Error updating subscription on payment success:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription: string | null };
        if (invoice.subscription) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          if (error) console.error('Error updating subscription on payment failure:', error);
          else console.log(`Subscription ${invoice.subscription} marked as past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500 }
    );
  }
});
