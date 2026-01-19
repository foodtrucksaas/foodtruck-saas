import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/responses.ts';

interface UnsubscribeRequest {
  email: string;
  foodtruck_id?: string; // Si fourni, désabonne uniquement de ce foodtruck
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, foodtruck_id }: UnsubscribeRequest = await req.json();

    if (!email) {
      return errorResponse('Email requis', 400);
    }

    const supabase = createSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // Build the query
    let query = supabase
      .from('customers')
      .update({
        email_opt_in: false,
        sms_opt_in: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);

    // If foodtruck_id is provided, only unsubscribe from that foodtruck
    if (foodtruck_id) {
      query = query.eq('foodtruck_id', foodtruck_id);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Unsubscribe error:', error);
      return errorResponse('Erreur lors du désabonnement', 500);
    }

    // Log the unsubscribe action for audit
    console.log(`Unsubscribed: ${normalizedEmail}${foodtruck_id ? ` from foodtruck ${foodtruck_id}` : ' from all'}`);

    return jsonResponse({
      success: true,
      message: 'Désabonnement effectué avec succès',
    });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return errorResponse('Erreur lors du désabonnement', 500);
  }
});
