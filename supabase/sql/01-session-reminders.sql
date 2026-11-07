-- SkillCredit 1-hour reminders. Run in Supabase SQL Editor once.
-- Only the service-role Edge Function can call the atomic in-app reminder RPC.
-- Time values are existing YYYY-MM-DD and HH:MM TEXT, interpreted in Asia/Manila.
CREATE TABLE IF NOT EXISTS public.session_reminder_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date text NOT NULL,
  scheduled_time text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email')),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, recipient_id, scheduled_date, scheduled_time, channel)
);
ALTER TABLE public.session_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.session_reminder_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.session_reminder_deliveries TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.session_reminder_deliveries_id_seq TO service_role;

-- Single transaction: verify upcoming status + schedule, insert unique delivery + notification.
-- Concurrent scheduler calls cannot create duplicate in-app notices.
CREATE OR REPLACE FUNCTION public.create_session_one_hour_notice(
  p_session_id uuid, p_recipient_id uuid, p_scheduled_date text, p_scheduled_time text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_skill_title text; v_inserted_id bigint; v_start timestamptz;
BEGIN
  SELECT COALESCE(k.title,'your skill session') INTO v_skill_title
    FROM public.sessions s LEFT JOIN public.skills k ON k.id=s.skill_id
   WHERE s.id=p_session_id AND s.status='upcoming'
     AND (s.student_id=p_recipient_id OR s.instructor_id=p_recipient_id)
     AND s.scheduled_date=p_scheduled_date AND s.scheduled_time=p_scheduled_time;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_scheduled_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR p_scheduled_time !~ '^[0-9]{2}:[0-9]{2}$' THEN
    RETURN false;
  END IF;
  v_start := (p_scheduled_date || ' ' || p_scheduled_time)::timestamp AT TIME ZONE 'Asia/Manila';
  -- Scheduler runs each 5 minutes; allow a 10-minute window for delays.
  IF v_start <= now() + interval '50 minutes' OR v_start > now() + interval '60 minutes' THEN
    RETURN false;
  END IF;
  INSERT INTO public.session_reminder_deliveries
    (session_id,recipient_id,scheduled_date,scheduled_time,channel,status)
    VALUES (p_session_id,p_recipient_id,p_scheduled_date,p_scheduled_time,'in_app','sent')
    ON CONFLICT DO NOTHING RETURNING id INTO v_inserted_id;
  IF v_inserted_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.notifications (user_id,type,content,link_url)
    VALUES (p_recipient_id,'session_reminder_1h',
      'Your ' || v_skill_title || ' session will start in about 1 hour. Be ready!',
      '/sessions?session=' || p_session_id::text);
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END; $$;
REVOKE ALL ON FUNCTION public.create_session_one_hour_notice(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_one_hour_notice(uuid,uuid,text,text) TO service_role;
