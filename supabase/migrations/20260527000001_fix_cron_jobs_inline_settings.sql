-- Fix cron jobs: inline URL and secret instead of current_setting()
-- which requires ALTER DATABASE SET (not allowed on hosted Supabase)

-- Remove old jobs
SELECT cron.unschedule('send-trial-reminders');
SELECT cron.unschedule('expire-trials');

-- Recreate with inlined values
SELECT cron.schedule(
  'send-trial-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ueprfvraqcpqdljkhdji.supabase.co/functions/v1/send-trial-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer kI4UwY0CYXvHvPQvwcF1tMmPidn28FeXiIMGsMjDTsM="}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ueprfvraqcpqdljkhdji.supabase.co/functions/v1/expire-trials',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer kI4UwY0CYXvHvPQvwcF1tMmPidn28FeXiIMGsMjDTsM="}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
