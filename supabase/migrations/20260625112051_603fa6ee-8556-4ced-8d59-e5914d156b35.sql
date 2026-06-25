
-- 1. Equipment contact_number: revoke column-level SELECT from anon and authenticated
REVOKE SELECT (contact_number) ON public.equipment FROM anon, authenticated, PUBLIC;

-- 2. Weather cache: allow anon to read (intentional public reference data)
DROP POLICY IF EXISTS "Anyone can read weather cache" ON public.weather_cache;
CREATE POLICY "Anyone can read weather cache"
ON public.weather_cache
FOR SELECT
TO anon, authenticated
USING (true);
DROP POLICY IF EXISTS "Authenticated users can read weather cache" ON public.weather_cache;
GRANT SELECT ON public.weather_cache TO anon;

-- 3. Revoke EXECUTE on unused SECURITY DEFINER helper from authenticated
REVOKE EXECUTE ON FUNCTION public.get_owner_equipment_contact(uuid) FROM PUBLIC, anon, authenticated;
