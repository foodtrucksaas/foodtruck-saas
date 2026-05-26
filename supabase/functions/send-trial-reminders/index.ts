import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/responses.ts';
import {
  trialReminder7dHtml,
  trialReminder7dSubject,
} from '../_shared/emails/trial-reminder-7d.ts';
import {
  trialReminder3dHtml,
  trialReminder3dSubject,
} from '../_shared/emails/trial-reminder-3d.ts';
import {
  trialReminder1dHtml,
  trialReminder1dSubject,
} from '../_shared/emails/trial-reminder-1d.ts';

/**
 * Cron Edge Function: send trial reminder emails.
 * Runs once per day. Identifies trialing subscriptions at J-7, J-3, J-1
 * and sends reminder emails via Resend.
 * Idempotent: uses trial_reminder_Xd_sent_at columns to prevent duplicates.
 * Auth: CRON_SECRET header required.
 */

interface TrialingSubscription {
  id: string;
  foodtruck_id: string;
  trial_ends_at: string;
  stripe_subscription_id: string | null;
  trial_reminder_7d_sent_at: string | null;
  trial_reminder_3d_sent_at: string | null;
  trial_reminder_1d_sent_at: string | null;
  foodtruck: {
    name: string;
    user_id: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  raw_user_meta_data: { full_name?: string; name?: string } | null;
}

type ReminderTier = '7d' | '3d' | '1d';

function getReminderTier(daysRemaining: number): ReminderTier | null {
  if (daysRemaining <= 1) return '1d';
  if (daysRemaining <= 3) return '3d';
  if (daysRemaining <= 7) return '7d';
  return null;
}

function getSentAtColumn(tier: ReminderTier): string {
  return `trial_reminder_${tier}_sent_at`;
}

function wasSent(sub: TrialingSubscription, tier: ReminderTier): boolean {
  const col = getSentAtColumn(tier);
  return !!(sub as unknown as Record<string, unknown>)[col];
}

function buildEmail(
  tier: ReminderTier,
  params: { foodtruckName: string; ownerName: string; billingUrl: string; daysRemaining: number }
) {
  switch (tier) {
    case '7d':
      return {
        html: trialReminder7dHtml(params),
        subject: trialReminder7dSubject(params.daysRemaining),
      };
    case '3d':
      return {
        html: trialReminder3dHtml(params),
        subject: trialReminder3dSubject(params.daysRemaining),
      };
    case '1d':
      return {
        html: trialReminder1dHtml(params),
        subject: trialReminder1dSubject(),
      };
  }
}

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

    // Find all trialing subscriptions where trial_ends_at is within 7 days
    // and stripe_subscription_id IS NULL (no card added yet)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(
        `
        id,
        foodtruck_id,
        trial_ends_at,
        stripe_subscription_id,
        trial_reminder_7d_sent_at,
        trial_reminder_3d_sent_at,
        trial_reminder_1d_sent_at,
        foodtruck:foodtrucks!inner (
          name,
          user_id
        )
      `
      )
      .eq('status', 'trialing')
      .is('stripe_subscription_id', null)
      .lte('trial_ends_at', sevenDaysFromNow.toISOString())
      .gte('trial_ends_at', now.toISOString());

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return errorResponse('Failed to fetch subscriptions', 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return successResponse({ success: true, sent: 0, message: 'No trial reminders to send' });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return successResponse({ success: true, sent: 0, message: 'Email skipped (no API key)' });
    }

    const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'resend.dev';
    const dashboardUrl = Deno.env.get('DASHBOARD_URL') || 'https://pro.onmange.app';

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions as unknown as TrialingSubscription[]) {
      try {
        const trialEnd = new Date(sub.trial_ends_at).getTime();
        const daysRemaining = Math.ceil((trialEnd - now.getTime()) / 86400000);

        const tier = getReminderTier(daysRemaining);
        if (!tier) continue;

        // Already sent this tier?
        if (wasSent(sub, tier)) continue;

        // Look up user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          sub.foodtruck.user_id
        );
        if (userError || !userData?.user?.email) {
          console.error(`Cannot find user for subscription ${sub.id}:`, userError);
          continue;
        }

        const user = userData.user;
        const ownerName =
          (user.user_metadata as UserProfile['raw_user_meta_data'])?.full_name ||
          (user.user_metadata as UserProfile['raw_user_meta_data'])?.name ||
          'Bonjour';
        const billingUrl = `${dashboardUrl}/billing`;

        const { html, subject } = buildEmail(tier, {
          foodtruckName: sub.foodtruck.name,
          ownerName,
          billingUrl,
          daysRemaining,
        });

        // Atomically claim: set sent_at before sending to prevent duplicates
        const updatePayload: Record<string, string> = {};
        updatePayload[getSentAtColumn(tier)] = new Date().toISOString();

        const { data: claimed, error: claimError } = await supabase
          .from('subscriptions')
          .update(updatePayload)
          .eq('id', sub.id)
          .is(getSentAtColumn(tier), null)
          .select('id')
          .single();

        if (claimError || !claimed) {
          console.log(`Subscription ${sub.id} tier ${tier} already claimed, skipping`);
          continue;
        }

        // Send email
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `OnMange.app <noreply@${resendDomain}>`,
            to: [user.email],
            subject,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
          console.log(`Sent ${tier} reminder for subscription ${sub.id} to ${user.email}`);
        } else {
          // Reset sent_at to allow retry
          const resetPayload: Record<string, null> = {};
          resetPayload[getSentAtColumn(tier)] = null;
          await supabase.from('subscriptions').update(resetPayload).eq('id', sub.id);

          const errorText = await res.text();
          console.error(`Failed to send ${tier} reminder for ${sub.id}:`, errorText);
          errors.push(`${sub.id} (${tier}): ${errorText}`);
        }
      } catch (err) {
        console.error(`Error processing subscription ${sub.id}:`, err);
        errors.push(`${sub.id}: ${err.message}`);
      }
    }

    return successResponse({
      success: true,
      sent: sentCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in send-trial-reminders:', error);
    return errorResponse(error.message, 500);
  }
});
