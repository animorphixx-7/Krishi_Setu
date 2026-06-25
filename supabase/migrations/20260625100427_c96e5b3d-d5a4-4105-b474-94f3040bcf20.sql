
-- =========================================================
-- 1. Equipment: hide contact_number from non-owners
-- =========================================================
REVOKE SELECT ON public.equipment FROM anon, authenticated;
GRANT SELECT (id, owner_id, name, description, category, price_per_day, district, image_url, status, is_available, created_at, updated_at)
  ON public.equipment TO anon, authenticated;
GRANT SELECT (contact_number) ON public.equipment TO authenticated;
-- Restrict actual contact_number rows: only owner/admin via separate policy
DROP POLICY IF EXISTS "Anyone can view approved equipment" ON public.equipment;
CREATE POLICY "Anyone can view approved equipment"
  ON public.equipment FOR SELECT
  TO anon, authenticated
  USING (status = 'approved'::equipment_status OR owner_id = auth.uid());
-- contact_number column SELECT is granted only to authenticated; column-privilege + RLS together
-- but RLS row-level still lets any authenticated read approved rows. Use column privilege
-- to deny non-owners by revoking from authenticated and re-granting only to owner via function/RPC.
REVOKE SELECT (contact_number) ON public.equipment FROM authenticated;
-- Owners read their own contact via row-policy "Owners can update/view own equipment" combined
-- with full grant on owner-only role through a wrapper. Simplest: grant column to authenticated
-- but rely on app to call get_masked_contact. To truly hide, recreate via security definer view.
CREATE OR REPLACE VIEW public.equipment_owner_private AS
  SELECT id, owner_id, contact_number FROM public.equipment;
ALTER VIEW public.equipment_owner_private SET (security_invoker = true);
GRANT SELECT ON public.equipment_owner_private TO authenticated;
-- Re-grant contact_number to authenticated so owner queries still work; rely on RLS + app policy
GRANT SELECT (contact_number) ON public.equipment TO authenticated;
-- Add restrictive policy: contact_number visible only via owner row policy
-- (PostgreSQL column privileges + row policies; non-owners reading approved rows can still see column unless we split).
-- Solution: create a stricter SELECT policy specifically requiring owner or admin for contact reads is not possible per-column.
-- We therefore expose only safe columns by guidance; revoke SELECT on contact_number from authenticated again and provide via get_masked_contact RPC.
REVOKE SELECT (contact_number) ON public.equipment FROM authenticated;
-- Owners need to read contact_number on their own equipment (MyEquipment page).
-- Provide via SECURITY DEFINER RPC:
CREATE OR REPLACE FUNCTION public.get_owner_equipment_contact(_equipment_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_number FROM public.equipment
  WHERE id = _equipment_id
    AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role));
$$;
REVOKE EXECUTE ON FUNCTION public.get_owner_equipment_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_equipment_contact(uuid) TO authenticated;

-- =========================================================
-- 2. Equipment INSERT requires equipment_owner or admin role
-- =========================================================
DROP POLICY IF EXISTS "Owners can insert equipment" ON public.equipment;
CREATE POLICY "Owners can insert equipment"
  ON public.equipment FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND (public.has_role(auth.uid(), 'equipment_owner'::user_role)
         OR public.has_role(auth.uid(), 'admin'::user_role))
  );

-- =========================================================
-- 3. Profiles: hide phone/address from other users
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view equipment owner profiles" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, role, district, created_at, updated_at) ON public.profiles TO authenticated;
GRANT SELECT (phone, address) ON public.profiles TO authenticated;
-- Restrict phone/address: use column-level grant + view of public-safe data
CREATE POLICY "Public can view safe profile of approved equipment owners"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT owner_id FROM public.equipment WHERE status = 'approved'::equipment_status)
  );
-- The "Users can view own profile" policy already exists for full row access by self.
-- Non-owners can read non-sensitive columns by app convention; revoke phone/address from non-self via separate RPC.
REVOKE SELECT (phone, address) ON public.profiles FROM authenticated;
-- Owner-self reads use existing "Users can view own profile" policy with full grants:
GRANT SELECT ON public.profiles TO authenticated;
-- The above re-grants everything; instead, keep restricted and add RPC for self:
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, role, district, created_at, updated_at) ON public.profiles TO authenticated;
-- Self can read phone/address through get_own_profile() (already exists, SECURITY DEFINER).
GRANT ALL ON public.profiles TO service_role;

-- =========================================================
-- 4. Bookings: block self status escalation; restrict updatable columns
-- =========================================================
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can cancel own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'cancelled'::booking_status
  );

-- =========================================================
-- 5. Bookings: server-side total_price computation trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_booking_total_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_price numeric(10,2);
  day_count integer;
BEGIN
  SELECT price_per_day INTO day_price FROM public.equipment WHERE id = NEW.equipment_id;
  IF day_price IS NULL THEN
    RAISE EXCEPTION 'Equipment not found';
  END IF;
  day_count := GREATEST((NEW.end_date - NEW.start_date) + 1, 1);
  NEW.total_price := day_price * day_count;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_booking_total_price_ins ON public.bookings;
CREATE TRIGGER enforce_booking_total_price_ins
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_total_price();
DROP TRIGGER IF EXISTS enforce_booking_total_price_upd ON public.bookings;
CREATE TRIGGER enforce_booking_total_price_upd
  BEFORE UPDATE OF start_date, end_date, equipment_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_total_price();

-- =========================================================
-- 6. Activity logs: remove client INSERT
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
REVOKE INSERT ON public.activity_logs FROM anon, authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- =========================================================
-- 7. SECURITY DEFINER functions: restrict EXECUTE
-- =========================================================
-- Trigger functions should not be client-callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_forum_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_booking_total_price() FROM PUBLIC, anon, authenticated;

-- Server-only helpers
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, notification_type, text, text, uuid, text) FROM PUBLIC, anon, authenticated;

-- get_masked_contact: only authenticated needs to call
REVOKE EXECUTE ON FUNCTION public.get_masked_contact(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_masked_contact(text, uuid) TO authenticated;

-- get_safe_profile: keep callable by authenticated only
REVOKE EXECUTE ON FUNCTION public.get_safe_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safe_profile(uuid) TO authenticated;

-- get_own_profile: authenticated only
REVOKE EXECUTE ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- has_role: used inside RLS policies; needs to be callable by anon and authenticated (policy evaluator)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO anon, authenticated;

-- get_equipment_public: keep public listing
REVOKE EXECUTE ON FUNCTION public.get_equipment_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_equipment_public(uuid) TO anon, authenticated;
