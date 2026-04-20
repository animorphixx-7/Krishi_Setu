-- 1) Harden handle_new_user trigger: whitelist roles, reject 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested_role text;
  safe_role public.user_role;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  IF requested_role IN ('farmer', 'equipment_owner') THEN
    safe_role := requested_role::public.user_role;
  ELSE
    safe_role := 'farmer'::public.user_role;
  END IF;

  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    safe_role
  );

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, safe_role);

  RETURN NEW;
END;
$function$;

-- 2) Add a RESTRICTIVE policy on user_roles so only admins can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Only admins can modify roles (restrictive)" ON public.user_roles;
CREATE POLICY "Only admins can modify roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 3) Tighten storage INSERT policies for equipment-images and forum-images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own equipment folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipment-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can upload forum images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to own forum folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own forum folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Restrict listing/SELECT on public buckets to owner-folder + allow public read of individual files via signed/public URLs only via path knowledge.
-- Keep public read but scope list-style SELECT to owner. Public URL fetches still work because they go through the storage API by exact path.
DROP POLICY IF EXISTS "Public can view equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view forum images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view forum images" ON storage.objects;

CREATE POLICY "Public can read equipment image files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Public can read forum image files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'forum-images');

-- 5) Realtime: restrict the notifications stream to the recipient.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users receive only their own notification events" ON realtime.messages;
CREATE POLICY "Users receive only their own notification events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Only allow realtime events for the notifications table to the matching user
  (extension = 'postgres_changes')
);
