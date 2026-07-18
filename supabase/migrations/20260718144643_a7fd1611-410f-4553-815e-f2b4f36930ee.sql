
-- 1. Equipment status change protection
DROP POLICY IF EXISTS "Owners can update own equipment" ON public.equipment;
CREATE POLICY "Owners can update own equipment"
ON public.equipment
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.prevent_equipment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_equipment_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_equipment_status_change ON public.equipment;
CREATE TRIGGER trg_prevent_equipment_status_change
BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.prevent_equipment_status_change();

-- 2. Public read policies on storage.objects (buckets are now private; policies grant read)
DROP POLICY IF EXISTS "Public can read equipment images" ON storage.objects;
CREATE POLICY "Public can read equipment images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'equipment-images');

DROP POLICY IF EXISTS "Public can read forum images" ON storage.objects;
CREATE POLICY "Public can read forum images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'forum-images');

-- 3. Revoke unused SECURITY DEFINER function from authenticated
REVOKE EXECUTE ON FUNCTION public.get_owner_equipment_contact(uuid) FROM PUBLIC, anon, authenticated;
