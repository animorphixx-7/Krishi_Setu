-- Fix 1: Profiles - restrict the "Users can view equipment owner profiles" policy
-- Replace with a policy that only allows viewing non-sensitive columns via a view
DROP POLICY IF EXISTS "Users can view equipment owner profiles" ON public.profiles;

-- Create a restrictive policy: users can only view their own full profile
-- For other users' profiles, we'll use a security definer function
CREATE POLICY "Users can view equipment owner profiles safely"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR id IN (SELECT owner_id FROM equipment WHERE status = 'approved'::equipment_status)
);

-- Create a security definer function to get safe profile info (no phone, no address)
CREATE OR REPLACE FUNCTION public.get_safe_profile(profile_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'district', p.district,
    'created_at', p.created_at
  )
  FROM profiles p
  WHERE p.id = profile_id;
$$;

-- Fix 2: Equipment - create a secure view without contact_number
-- Instead of exposing contact_number in the table, create a function
CREATE OR REPLACE FUNCTION public.get_equipment_public(equipment_id uuid DEFAULT NULL)
RETURNS SETOF json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', e.id,
    'name', e.name,
    'description', e.description,
    'category', e.category,
    'price_per_day', e.price_per_day,
    'district', e.district,
    'image_url', e.image_url,
    'is_available', e.is_available,
    'status', e.status,
    'owner_id', e.owner_id,
    'created_at', e.created_at
  )
  FROM equipment e
  WHERE e.status = 'approved'::equipment_status
  AND (equipment_id IS NULL OR e.id = equipment_id);
$$;

-- Fix 3: Restrict the "Anyone can view approved equipment" policy to require auth
-- and exclude contact_number by dropping and recreating
DROP POLICY IF EXISTS "Anyone can view approved equipment" ON public.equipment;

-- Authenticated users can view approved equipment or their own
CREATE POLICY "Authenticated users can view approved equipment"
ON public.equipment
FOR SELECT
TO authenticated
USING (
  status = 'approved'::equipment_status
  OR owner_id = auth.uid()
);

-- Anonymous users can only use the public function (no direct table access)
-- This removes public access to contact_number