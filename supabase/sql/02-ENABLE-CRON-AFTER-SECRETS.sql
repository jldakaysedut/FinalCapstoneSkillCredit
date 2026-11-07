-- ONLY run after deploying Edge Function and setting SESSION_REMINDER_CRON_SECRET.
-- Enable pg_cron + pg_net + Vault in Supabase Dashboard if not available.
-- 1) In Supabase SQL editor, set the *same strong random secret* as in Edge Secrets:
--    SELECT vault.create_secret('REPLACE_WITH_RANDOM_TOKEN', 'skillcredit_session_reminder_cron_token');
-- 2) Run this query to schedule a call every 5 minutes.
-- IMPORTANT: a wrong project URL will trigger no reminders.
SELECT cron.schedule(
  'skillcredit-one-hour-session-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://asngaiswkgirvbamzwvd.supabase.co/functions/v1/session-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='skillcredit_session_reminder_cron_token' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
-- Inspect configured jobs: SELECT jobid, jobname, schedule, active FROM cron.job;
-- Unschedule when needed: SELECT cron.unschedule('skillcredit-one-hour-session-reminders');
