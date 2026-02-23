
-- Fix: Replace overly permissive notifications INSERT policy
-- All notification inserts happen via SECURITY DEFINER functions (send_notification, notify_new_booking, notify_booking_status_change)
-- which bypass RLS, so we can safely block direct client inserts.

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Only backend can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);
