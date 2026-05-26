-- Add trial reminder tracking columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN trial_reminder_7d_sent_at TIMESTAMPTZ,
ADD COLUMN trial_reminder_3d_sent_at TIMESTAMPTZ,
ADD COLUMN trial_reminder_1d_sent_at TIMESTAMPTZ;

-- Index for efficient cron queries on trialing subscriptions
CREATE INDEX idx_subscriptions_trial_reminders
ON subscriptions(status, trial_ends_at)
WHERE status = 'trialing';

-- Add expired_trial to status check if not already present
-- (The original migration already includes it in the CHECK constraint)
