
-- 1) equipment owners cannot self-approve
DROP POLICY IF EXISTS "Owners can update own equipment" ON public.equipment;
CREATE POLICY "Owners can update own equipment"
ON public.equipment
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR status = (SELECT e.status FROM public.equipment e WHERE e.id = equipment.id)
  )
);

-- 2) bookings: explicit owner update policy restricted to safe transitions
DROP POLICY IF EXISTS "Owners can update bookings on their equipment" ON public.bookings;
CREATE POLICY "Owners can update bookings on their equipment"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT e.owner_id FROM public.equipment e WHERE e.id = bookings.equipment_id)
)
WITH CHECK (
  auth.uid() IN (SELECT e.owner_id FROM public.equipment e WHERE e.id = bookings.equipment_id)
  AND status IN ('confirmed'::booking_status, 'completed'::booking_status, 'cancelled'::booking_status)
);

-- 3) prevent users tampering with total_price/equipment_id on update
CREATE OR REPLACE FUNCTION public.prevent_booking_price_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.equipment_id IS DISTINCT FROM OLD.equipment_id THEN
    NEW.equipment_id := OLD.equipment_id;
  END IF;
  IF NEW.total_price IS DISTINCT FROM OLD.total_price
     AND NEW.start_date = OLD.start_date
     AND NEW.end_date   = OLD.end_date
     AND NEW.equipment_id = OLD.equipment_id THEN
    NEW.total_price := OLD.total_price;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_booking_price_tampering() FROM PUBLIC;
DROP TRIGGER IF EXISTS prevent_booking_price_tampering_trg ON public.bookings;
CREATE TRIGGER prevent_booking_price_tampering_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_price_tampering();

-- 4) remove broad profile exposure for equipment owners
DROP POLICY IF EXISTS "Public can view safe profile of approved equipment owners" ON public.profiles;

-- 5) revoke EXECUTE from PUBLIC on internal definer helpers
REVOKE EXECUTE ON FUNCTION public.enforce_booking_total_price() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_booking_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_booking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_forum_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_user_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, notification_type, text, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_weather_cache() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_masked_contact(text, uuid) FROM PUBLIC;
