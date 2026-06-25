
CREATE OR REPLACE FUNCTION public.log_user_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_type text;
  v_desc text;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id, auth.uid());
  IF v_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'crop_recommendations' AND TG_OP = 'INSERT' THEN
    v_type := 'crop_recommendation_generated';
    v_desc := COALESCE('Recommendation for ' || NEW.top_crop, 'Crop recommendation generated');
    v_meta := jsonb_build_object('district', NEW.district, 'season', NEW.season, 'top_crop', NEW.top_crop);
  ELSIF TG_TABLE_NAME = 'disease_scans' AND TG_OP = 'INSERT' THEN
    v_type := 'disease_scan';
    v_desc := COALESCE('Scan: ' || NEW.plant_name || COALESCE(' / ' || NEW.disease_name, ''), 'Disease scan');
    v_meta := jsonb_build_object('plant', NEW.plant_name, 'disease', NEW.disease_name, 'health', NEW.health_status);
  ELSIF TG_TABLE_NAME = 'ai_conversations' AND TG_OP = 'INSERT' THEN
    v_type := 'ai_conversation_started';
    v_desc := COALESCE('Started chat: ' || NEW.title, 'AI conversation started');
    v_meta := jsonb_build_object('language', NEW.language);
  ELSIF TG_TABLE_NAME = 'farming_advice' AND TG_OP = 'INSERT' THEN
    v_type := 'farming_advice_requested';
    v_desc := COALESCE('Advice (' || NEW.advice_type || ') for ' || NEW.crop, 'Farming advice requested');
    v_meta := jsonb_build_object('advice_type', NEW.advice_type, 'crop', NEW.crop, 'district', NEW.district);
  ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    IF NEW IS DISTINCT FROM OLD THEN
      v_type := 'profile_updated';
      v_desc := 'Profile updated';
      v_meta := jsonb_build_object(
        'changed_district', NEW.district IS DISTINCT FROM OLD.district,
        'changed_phone', NEW.phone IS DISTINCT FROM OLD.phone,
        'changed_name', NEW.full_name IS DISTINCT FROM OLD.full_name
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.activity_logs (user_id, event_type, description, metadata)
  VALUES (v_user, v_type, v_desc, v_meta);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_user_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_crop_recommendations ON public.crop_recommendations;
CREATE TRIGGER trg_log_crop_recommendations
AFTER INSERT ON public.crop_recommendations
FOR EACH ROW EXECUTE FUNCTION public.log_user_event();

DROP TRIGGER IF EXISTS trg_log_disease_scans ON public.disease_scans;
CREATE TRIGGER trg_log_disease_scans
AFTER INSERT ON public.disease_scans
FOR EACH ROW EXECUTE FUNCTION public.log_user_event();

DROP TRIGGER IF EXISTS trg_log_ai_conversations ON public.ai_conversations;
CREATE TRIGGER trg_log_ai_conversations
AFTER INSERT ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.log_user_event();

DROP TRIGGER IF EXISTS trg_log_farming_advice ON public.farming_advice;
CREATE TRIGGER trg_log_farming_advice
AFTER INSERT ON public.farming_advice
FOR EACH ROW EXECUTE FUNCTION public.log_user_event();

DROP TRIGGER IF EXISTS trg_log_profile_updates ON public.profiles;
CREATE TRIGGER trg_log_profile_updates
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_user_event();
