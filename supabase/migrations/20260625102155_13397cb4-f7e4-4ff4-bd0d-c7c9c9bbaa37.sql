
-- crop_recommendations
CREATE TABLE public.crop_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  district TEXT,
  soil_type TEXT,
  farm_size NUMERIC,
  irrigation_type TEXT,
  season TEXT,
  water_availability TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  weather_snapshot JSONB,
  recommendations JSONB NOT NULL,
  top_crop TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_recommendations TO authenticated;
GRANT ALL ON public.crop_recommendations TO service_role;
ALTER TABLE public.crop_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crop recs" ON public.crop_recommendations FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_crop_recs_user_created ON public.crop_recommendations (user_id, created_at DESC);
CREATE TRIGGER trg_crop_recs_updated_at BEFORE UPDATE ON public.crop_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- disease_scans
CREATE TABLE public.disease_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  plant_name TEXT,
  disease_name TEXT,
  health_status TEXT,
  confidence TEXT,
  severity TEXT,
  language TEXT DEFAULT 'English',
  diagnosis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disease_scans TO authenticated;
GRANT ALL ON public.disease_scans TO service_role;
ALTER TABLE public.disease_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own disease scans" ON public.disease_scans FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_disease_scans_user_created ON public.disease_scans (user_id, created_at DESC);
CREATE TRIGGER trg_disease_scans_updated_at BEFORE UPDATE ON public.disease_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_conversations
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  language TEXT NOT NULL DEFAULT 'English',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.ai_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ai_convs_user_last ON public.ai_conversations (user_id, last_message_at DESC);
CREATE TRIGGER trg_ai_convs_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_messages
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.ai_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ai_msgs_conv_created ON public.ai_messages (conversation_id, created_at);

-- farming_advice
CREATE TABLE public.farming_advice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advice_type TEXT NOT NULL CHECK (advice_type IN ('daily','weekly','irrigation','fertilizer','pest','harvest')),
  crop TEXT,
  crop_stage TEXT,
  district TEXT,
  weather_snapshot JSONB,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farming_advice TO authenticated;
GRANT ALL ON public.farming_advice TO service_role;
ALTER TABLE public.farming_advice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own advice" ON public.farming_advice FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_farming_advice_user_created ON public.farming_advice (user_id, created_at DESC);
CREATE INDEX idx_farming_advice_type ON public.farming_advice (user_id, advice_type, created_at DESC);
CREATE TRIGGER trg_farming_advice_updated_at BEFORE UPDATE ON public.farming_advice
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
