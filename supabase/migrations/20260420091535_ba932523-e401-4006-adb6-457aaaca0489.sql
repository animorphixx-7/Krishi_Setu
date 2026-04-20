-- 1) Restrict direct SELECT on equipment.contact_number; force use of get_masked_contact RPC
REVOKE SELECT (contact_number) ON public.equipment FROM anon, authenticated;

-- 2) Add length CHECK constraints to forum tables
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT forum_posts_content_length CHECK (char_length(content) <= 10000);

ALTER TABLE public.forum_comments
  ADD CONSTRAINT forum_comments_content_length CHECK (char_length(content) <= 2000);

-- 3) Replace overly broad realtime policy with user-scoped one.
DROP POLICY IF EXISTS "Users receive only their own notification events" ON realtime.messages;

CREATE POLICY "Users receive only their own notification events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  AND realtime.topic() = ('notifications:' || auth.uid()::text)
);
