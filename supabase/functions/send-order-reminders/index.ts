import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/responses.ts';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * This function is called periodically (via cron) to send reminder emails
 * for orders that:
 * - Have pickup_time within the next 30-35 minutes
 * - Were created more than 2 hours before pickup
 * - Haven't received a reminder yet
 * - Have status = 'confirmed'
 * - Belong to a foodtruck with send_reminder_email = true
 */

interface OrderForReminder {
  id: string;
  customer_name: string;
  customer_email: string;
  pickup_time: string;
  total_amount: number;
  foodtruck: {
    name: string;
    phone: string | null;
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseAdmin();

    // Calculate time windows
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    // Find orders that need reminders
    // Orders where:
    // - pickup_time is between 30 and 35 minutes from now
    // - reminder_sent_at is null
    // - status is 'confirmed'
    // - customer_email is not 'surplace@local'
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        `
        id,
        customer_name,
        customer_email,
        pickup_time,
        created_at,
        total_amount,
        foodtruck:foodtrucks!inner (
          name,
          phone,
          send_reminder_email
        )
      `
      )
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null)
      .neq('customer_email', 'surplace@local')
      .gte('pickup_time', thirtyMinutesFromNow.toISOString())
      .lte('pickup_time', thirtyFiveMinutesFromNow.toISOString())
      .eq('foodtruck.send_reminder_email', true);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return errorResponse('Failed to fetch orders', 500);
    }

    if (!orders || orders.length === 0) {
      return successResponse({ success: true, sent: 0, message: 'No reminders to send' });
    }

    // Filter orders where created_at was more than 2 hours before pickup_time
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const ordersToRemind = orders.filter((order: { pickup_time: string; created_at: string }) => {
      const pickupTime = new Date(order.pickup_time).getTime();
      const createdAt = new Date(order.created_at).getTime();
      return pickupTime - createdAt > twoHoursInMs;
    }) as unknown as OrderForReminder[];

    if (ordersToRemind.length === 0) {
      return successResponse({
        success: true,
        sent: 0,
        message: 'No orders qualify for reminder (all ordered < 2h before pickup)',
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return successResponse({ success: true, sent: 0, message: 'Email skipped (no API key)' });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const order of ordersToRemind) {
      try {
        // RACE CONDITION FIX: Atomically claim this order before sending
        // Use UPDATE with WHERE to ensure only one process handles each order
        const { data: claimedOrder, error: claimError } = await supabase
          .from('orders')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', order.id)
          .is('reminder_sent_at', null) // Only claim if not already claimed
          .select('id')
          .single();

        // If claim failed (another process got it first), skip this order
        if (claimError || !claimedOrder) {
          console.log(`Order ${order.id} already claimed by another process, skipping`);
          continue;
        }

        // Format pickup time
        const pickupDate = new Date(order.pickup_time);
        const pickupTimeStr = pickupDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const total = (order.total_amount / 100).toFixed(2);

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background-color:#f3f4f6">
            <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif">
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:white;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0">
                <h1 style="margin:0;font-size:28px;font-weight:600">Rappel de commande</h1>
              </div>

              <!-- Content -->
              <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
                <p style="font-size:16px;color:#374151;margin:0 0 20px">
                  Bonjour <strong>${escapeHtml(order.customer_name)}</strong>,
                </p>
                <p style="font-size:16px;color:#374151;margin:0 0 20px">
                  Pour rappel, votre commande chez <strong style="color:#3b82f6">${escapeHtml(order.foodtruck.name)}</strong> sera disponible à :
                </p>

                <!-- Pickup time highlight -->
                <div style="background:#dbeafe;padding:25px;border-radius:12px;margin:25px 0;text-align:center">
                  <div style="font-size:42px;font-weight:700;color:#1e40af">${pickupTimeStr}</div>
                  <p style="margin:10px 0 0;color:#1e3a8a;font-size:14px">Montant à régler sur place : <strong>${total}€</strong></p>
                </div>

                <p style="font-size:14px;color:#6b7280;margin:20px 0;text-align:center">
                  N'oubliez pas de venir récupérer votre commande !
                </p>

                ${
                  order.foodtruck.phone
                    ? `
                  <p style="font-size:14px;color:#6b7280;margin:20px 0 0;text-align:center">
                    Une question ? Contactez-nous au <a href="tel:${escapeHtml(order.foodtruck.phone)}" style="color:#3b82f6;text-decoration:none;font-weight:500">${escapeHtml(order.foodtruck.phone)}</a>
                  </p>
                `
                    : ''
                }

                <p style="font-size:16px;color:#374151;margin:30px 0 0;text-align:center">
                  À tout de suite !
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
                <p style="margin:0">Cet email a été envoyé par ${escapeHtml(order.foodtruck.name)}</p>
              </div>
            </div>
          </body>
          </html>`;

        const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'resend.dev';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${order.foodtruck.name} <commandes@${resendDomain}>`,
            to: [order.customer_email],
            subject: `Rappel - Votre commande est bientôt prête !`,
            html,
          }),
        });

        if (res.ok) {
          // Already marked as sent before sending (see below)
          sentCount++;
        } else {
          // Reset reminder_sent_at to allow retry
          await supabase.from('orders').update({ reminder_sent_at: null }).eq('id', order.id);
          const errorText = await res.text();
          console.error(`Failed to send reminder for order ${order.id}:`, errorText);
          errors.push(`Order ${order.id}: ${errorText}`);
        }
      } catch (err) {
        console.error(`Error processing order ${order.id}:`, err);
        errors.push(`Order ${order.id}: ${err.message}`);
      }
    }

    return successResponse({
      success: true,
      sent: sentCount,
      total: ordersToRemind.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in send-order-reminders:', error);
    return errorResponse(error.message, 500);
  }
});
