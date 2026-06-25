
CREATE OR REPLACE FUNCTION public.log_auth_event(_event_type text, _description text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF _event_type NOT IN ('login','logout') THEN
    RAISE EXCEPTION 'invalid event type';
  END IF;
  INSERT INTO public.activity_logs (user_id, event_type, description)
  VALUES (auth.uid(), _event_type, COALESCE(_description, _event_type));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_auth_event(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(text, text) TO authenticated;
