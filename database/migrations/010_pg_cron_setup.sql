-- ============================================================
-- InventoryEver - pg_cron Scheduled Jobs
-- PREREQUISITE: Enable pg_cron in Supabase Dashboard → Database → Extensions
-- Then set service role key:
--   ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily push notifications at 9am UTC
SELECT cron.schedule(
  'send-daily-push-notifications',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://senmpagpravittvayecz.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Daily warranty alert generation at 8am UTC
SELECT cron.schedule(
  'generate-warranty-alerts',
  '0 8 * * *',
  $$ SELECT generate_warranty_alerts(); $$
);

-- Verify: SELECT * FROM cron.job;
-- Unschedule: SELECT cron.unschedule('send-daily-push-notifications');
