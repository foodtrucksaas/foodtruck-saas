import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/responses.ts';

/**
 * Cron Edge Function: expire trials.
 * Runs once per hour. Identifies trialing subscriptions where:
 * - trial_ends_at < NOW()
 * - stripe_subscription_id IS NULL (no card added)
 * Sets status to 'expired_trial'.
 * Auth: CRON_SECRET header required.
 */

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth: verify CRON_SECRET
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    // Find and expire trials
    const { data: expired, error: expireError } = await supabase
      .from('subscriptions')
      .update({ status: 'expired_trial', updated_at: now })
      .eq('status', 'trialing')
      .is('stripe_subscription_id', null)
      .lt('trial_ends_at', now)
      .select('id, foodtruck_id');

    if (expireError) {
      console.error('Error expiring trials:', expireError);
      return errorResponse('Failed to expire trials', 500);
    }

    const count = expired?.length || 0;
    if (count > 0) {
      console.log(
        `Expired ${count} trials:`,
        expired!.map((s) => s.id)
      );
    }

    return successResponse({
      success: true,
      expired: count,
      ids: expired?.map((s) => s.id) || [],
    });
  } catch (error) {
    console.error('Error in expire-trials:', error);
    return errorResponse(error.message, 500);
  }
});
