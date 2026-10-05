CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_creator_reminder(function_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  IF function_name NOT IN (
    'follow_up_7_days',
    'follow_up_30_days',
    'sample_reminder_day_3',
    'sample_reminder_day_7'
  ) THEN
    RAISE EXCEPTION 'Unsupported creator reminder function: %', function_name;
  END IF;

  SELECT decrypted_secret
    INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'creator_tracker_project_url';

  SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'creator_tracker_service_role_key';

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Add creator_tracker_project_url and creator_tracker_service_role_key to Supabase Vault before scheduling reminders.';
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  )
  INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_creator_reminder(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_creator_reminder(text) TO postgres;

DO $$
DECLARE
  function_name text;
  job_name text;
  existing_job record;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'follow_up_7_days',
    'follow_up_30_days',
    'sample_reminder_day_3',
    'sample_reminder_day_7'
  ]
  LOOP
    job_name := 'creator-tracker-' || function_name;

    FOR existing_job IN
      SELECT jobid FROM cron.job WHERE jobname = job_name
    LOOP
      PERFORM cron.unschedule(existing_job.jobid);
    END LOOP;

    PERFORM cron.schedule(
      job_name,
      '0 2 * * *',
      format('SELECT public.invoke_creator_reminder(%L);', function_name)
    );
  END LOOP;
END;
$$;
