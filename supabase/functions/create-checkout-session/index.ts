import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getStripe, getOrCreateCustomer } from '../_shared/stripe.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  try {
    // Auth: verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    // Find the foodtruck owned by this user
    const supabaseAdmin = createSupabaseAdmin();
    const { data: foodtruck, error: ftError } = await supabaseAdmin
      .from('foodtrucks')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (ftError || !foodtruck) {
      return new Response(JSON.stringify({ error: 'Food truck non trouvé' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Get the subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('foodtruck_id', foodtruck.id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription non trouvée' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Get or create Stripe Customer
    let stripeCustomerId = subscription.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await getOrCreateCustomer(user.email!, foodtruck.id);
      stripeCustomerId = customer.id;

      // Save stripe_customer_id to subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq('id', subscription.id);
    }

    // Build Checkout Session params
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'STRIPE_PRICE_ID non configuré' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const stripe = getStripe();

    const sessionParams: Record<string, unknown> = {
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      success_url: 'https://pro.onmange.app/billing?success=1',
      cancel_url: 'https://pro.onmange.app/billing',
      subscription_data: {
        metadata: { foodtruck_id: foodtruck.id },
      },
    };

    // If still in trial, pass trial_end so the user isn't charged immediately
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      const trialEnd = Math.floor(new Date(subscription.trial_ends_at).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      // Only set trial_end if it's in the future (at least 48h from now per Stripe minimum)
      if (trialEnd > now + 48 * 3600) {
        sessionParams.subscription_data = {
          ...(sessionParams.subscription_data as Record<string, unknown>),
          trial_end: trialEnd,
        };
      }
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
