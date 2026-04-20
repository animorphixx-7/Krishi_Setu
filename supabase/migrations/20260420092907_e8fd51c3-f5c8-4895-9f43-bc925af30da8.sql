DROP POLICY IF EXISTS "Authenticated users can view approved equipment" ON public.equipment;

CREATE POLICY "Anyone can view approved equipment"
ON public.equipment
FOR SELECT
TO anon, authenticated
USING (status = 'approved'::equipment_status OR owner_id = auth.uid());

-- Allow public to read equipment owner profiles for approved listings
DROP POLICY IF EXISTS "Users can view equipment owner profiles safely" ON public.profiles;

CREATE POLICY "Anyone can view equipment owner profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = id
  OR id IN (SELECT owner_id FROM public.equipment WHERE status = 'approved'::equipment_status)
);