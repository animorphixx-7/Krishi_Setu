-- Grant phone and address SELECT back to the service_role (used by security definer functions)
-- The authenticated role can't see these columns directly, but can via RPC functions

-- Create a function for users to get their own full profile including phone and address
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'phone', p.phone,
    'address', p.address,
    'district', p.district,
    'role', p.role,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  FROM profiles p
  WHERE p.id = auth.uid();
$$;