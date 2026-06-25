
CREATE TABLE public.weather_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_key TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weather_cache TO authenticated;
GRANT ALL ON public.weather_cache TO service_role;

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weather cache"
  ON public.weather_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_weather_cache_location_key ON public.weather_cache (location_key);
CREATE INDEX idx_weather_cache_expires_at ON public.weather_cache (expires_at);
CREATE INDEX idx_weather_cache_lat_lng ON public.weather_cache (latitude, longitude);

CREATE TRIGGER trg_weather_cache_updated_at
  BEFORE UPDATE ON public.weather_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cleanup_expired_weather_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.weather_cache
  WHERE expires_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_weather_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_weather_cache() TO service_role;
