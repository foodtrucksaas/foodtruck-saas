import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getStripe } from '../_shared/stripe.ts';
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

    // Find the foodtruck
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

    // Get subscription with stripe_customer_id
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('foodtruck_id', foodtruck.id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription non trouvée' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (!subscription.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Aucune subscription Stripe à gérer' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: 'https://pro.onmange.app/billing',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error('create-portal-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
