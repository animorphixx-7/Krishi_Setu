
-- 1. Restrict profiles SELECT to authenticated users only (no anon access to phone numbers)
DROP POLICY IF EXISTS "Anyone can view equipment owner profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view equipment owner profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id)
  OR (id IN (SELECT equipment.owner_id FROM equipment WHERE equipment.status = 'approved'::equipment_status))
);

-- 2. Prevent non-admin users from spoofing admin replies
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

CREATE POLICY "Users can create messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_admin_reply = false);

-- 3. Remove misapplied realtime policy from public.messages
DROP POLICY IF EXISTS "Users receive only their own notification events" ON public.messages;

-- 4. Add proper realtime channel authorization on realtime.messages
DROP POLICY IF EXISTS "Users receive own notification events" ON realtime.messages;
CREATE POLICY "Users receive own notification events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (extension = 'postgres_changes')
  AND (
    realtime.topic() = ('notifications:' || (auth.uid())::text)
    OR realtime.topic() = 'forum_posts'
  )
);
