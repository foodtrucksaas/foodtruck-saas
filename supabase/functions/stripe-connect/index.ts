import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdmin } from '../_shared/supabase.ts';
import { createStripeClient } from '../_shared/stripe.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient(authHeader);
    const stripe = createStripeClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: foodtruck, error: foodtruckError } = await supabase
      .from('foodtrucks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (foodtruckError || !foodtruck) {
      return new Response(JSON.stringify({ error: 'Foodtruck not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dashboardUrl = Deno.env.get('DASHBOARD_URL') ?? 'http://localhost:5174';

    // If already has Stripe account, create login link
    if (foodtruck.stripe_account_id && foodtruck.stripe_onboarding_complete) {
      const loginLink = await stripe.accounts.createLoginLink(foodtruck.stripe_account_id);
      return new Response(JSON.stringify({ url: loginLink.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or retrieve Stripe account
    let stripeAccountId = foodtruck.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          foodtruck_id: foodtruck.id,
          user_id: user.id,
        },
      });

      stripeAccountId = account.id;

      // Update foodtruck with Stripe account ID
      const adminSupabase = createSupabaseAdmin();
      await adminSupabase
        .from('foodtrucks')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', foodtruck.id);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${dashboardUrl}/settings?stripe=refresh`,
      return_url: `${dashboardUrl}/settings?stripe=success`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
