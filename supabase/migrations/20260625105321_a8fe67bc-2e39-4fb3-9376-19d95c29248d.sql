
-- 1) Equipment contact_number: restrict column-level SELECT
REVOKE SELECT (contact_number) ON public.equipment FROM anon, authenticated;
GRANT SELECT (contact_number) ON public.equipment TO service_role;

-- 2) Consolidate duplicate Realtime policies on realtime.messages
DROP POLICY IF EXISTS "Users receive only their own notification events" ON realtime.messages;
DROP POLICY IF EXISTS "Users receive own notification events" ON realtime.messages;

CREATE POLICY "Realtime: own notifications and forum_posts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  AND (
    realtime.topic() = ('notifications:' || (auth.uid())::text)
    OR realtime.topic() = 'forum_posts'
  )
);

-- 3) Revoke EXECUTE on SECURITY DEFINER functions that don't need broad access
-- Trigger-only function: never callable by clients
REVOKE EXECUTE ON FUNCTION public.prevent_booking_price_tampering() FROM PUBLIC, anon, authenticated;

-- Duplicate of direct table read with RLS; not needed by clients
REVOKE EXECUTE ON FUNCTION public.get_equipment_public(uuid) FROM PUBLIC, anon, authenticated;

-- has_role: only needed inside RLS policies for authenticated; not for anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
