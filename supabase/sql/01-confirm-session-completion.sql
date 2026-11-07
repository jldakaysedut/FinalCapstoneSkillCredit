-- SkillCredit: one-time secured completion setup; NO new tables.
-- Prerequisite: public.sessions.credits_awarded_at timestamptz already exists.
-- Run in Supabase SQL Editor as project owner, ONCE before deploying Sessions.jsx.

CREATE OR REPLACE FUNCTION public.confirm_session_completion(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_new_teacher_done boolean;
  v_new_student_done boolean;
  v_confirmation_new boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_user NOT IN (v_session.student_id, v_session.instructor_id) THEN
    RAISE EXCEPTION 'You are not a participant of this session' USING ERRCODE = '42501';
  END IF;
  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object('state','completed','awarded',false,'new_confirmation',false);
  END IF;
  IF v_session.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Only active sessions can be marked complete' USING ERRCODE = '22023';
  END IF;
  IF v_session.credits_awarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'This session already has a credit award timestamp. Contact support before retrying.' USING ERRCODE = '23505';
  END IF;
  IF v_session.credit_amount IS NULL OR v_session.credit_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid session credit amount' USING ERRCODE = '22023';
  END IF;

  v_confirmation_new := CASE
    WHEN v_user = v_session.instructor_id THEN NOT COALESCE(v_session.instructor_completed,false)
    ELSE NOT COALESCE(v_session.student_completed,false)
  END;
  v_new_teacher_done := COALESCE(v_session.instructor_completed,false) OR (v_user = v_session.instructor_id);
  v_new_student_done := COALESCE(v_session.student_completed,false) OR (v_user = v_session.student_id);

  IF v_new_teacher_done AND v_new_student_done THEN
    -- Both updates share ONE transaction and the locked session row.
    -- A second caller sees completed and cannot pay again.
    UPDATE public.user_profiles
    SET credits_balance = COALESCE(credits_balance,0) + v_session.credit_amount
    WHERE id = v_session.instructor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Instructor profile missing' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.sessions
    SET instructor_completed = true,
        student_completed = true,
        status = 'completed',
        credits_awarded_at = transaction_timestamp()
    WHERE id = p_session_id;
    RETURN jsonb_build_object('state','completed','awarded',true,'new_confirmation',v_confirmation_new);
  END IF;

  UPDATE public.sessions
  SET instructor_completed = v_new_teacher_done,
      student_completed = v_new_student_done
  WHERE id = p_session_id;
  RETURN jsonb_build_object('state','waiting','awarded',false,'new_confirmation',v_confirmation_new);
END;
$function$;

-- Only authenticated callers may invoke this RPC; the function itself checks membership.
REVOKE ALL ON FUNCTION public.confirm_session_completion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_session_completion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_session_completion(uuid) TO authenticated;
