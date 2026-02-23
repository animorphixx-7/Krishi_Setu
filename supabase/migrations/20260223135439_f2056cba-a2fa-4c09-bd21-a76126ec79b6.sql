-- Revoke SELECT on contact_number from authenticated and anon roles
-- This ensures contact_number can't be read directly via API
REVOKE SELECT (contact_number) ON public.equipment FROM anon, authenticated;

-- Revoke SELECT on phone and address from authenticated and anon roles
-- These can only be accessed by the user themselves (via their own profile row)
-- We'll create a column-level grant for own profile access
REVOKE SELECT (phone, address) ON public.profiles FROM anon, authenticated;

-- Re-grant SELECT on non-sensitive columns for profiles
GRANT SELECT (id, full_name, district, created_at, updated_at, role) ON public.profiles TO authenticated;

-- Re-grant SELECT on non-sensitive columns for equipment
GRANT SELECT (id, name, description, category, price_per_day, district, image_url, is_available, status, owner_id, created_at, updated_at) ON public.equipment TO authenticated, anon;