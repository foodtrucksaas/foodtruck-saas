-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule send-order-reminders edge function every 5 minutes
-- Uses Supabase Vault to securely store the URL and service role key.
--
-- SETUP REQUIRED: Add these 2 secrets via Supabase Dashboard > SQL Editor:
--
--   SELECT vault.create_secret('supabase_url', 'https://<PROJECT_REF>.supabase.co');
--   SELECT vault.create_secret('service_role_key', '<YOUR_SERVICE_ROLE_KEY>');
--
SELECT cron.schedule(
  'send-order-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
           || '/functions/v1/send-order-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
