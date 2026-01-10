-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('booking', 'price_update', 'system', 'reminder');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID NULL, -- Optional: link to booking, equipment, etc.
  reference_type TEXT NULL, -- Optional: 'booking', 'equipment', 'market_price'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System/Admin can insert notifications for any user
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id UUID,
  _type notification_type,
  _title TEXT,
  _message TEXT,
  _reference_id UUID DEFAULT NULL,
  _reference_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (_user_id, _type, _title, _message, _reference_id, _reference_type)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger to auto-notify on booking status changes
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  equipment_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get equipment name
  SELECT name INTO equipment_name FROM public.equipment WHERE id = NEW.equipment_id;
  
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        notification_title := 'Booking Confirmed! ✅';
        notification_message := 'Your booking for ' || equipment_name || ' from ' || NEW.start_date || ' to ' || NEW.end_date || ' has been confirmed.';
      WHEN 'cancelled' THEN
        notification_title := 'Booking Cancelled';
        notification_message := 'Your booking for ' || equipment_name || ' has been cancelled.';
      WHEN 'completed' THEN
        notification_title := 'Booking Completed';
        notification_message := 'Your booking for ' || equipment_name || ' has been completed. Please leave a review!';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Insert notification for the user who made the booking
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (NEW.user_id, 'booking', notification_title, notification_message, NEW.id, 'booking');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to bookings table
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();

-- Create trigger to notify equipment owner of new bookings
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  equipment_record RECORD;
  booker_name TEXT;
BEGIN
  -- Get equipment details
  SELECT id, name, owner_id INTO equipment_record FROM public.equipment WHERE id = NEW.equipment_id;
  
  -- Get booker name
  SELECT full_name INTO booker_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify equipment owner
  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    equipment_record.owner_id,
    'booking',
    'New Booking Request 📋',
    booker_name || ' has requested to book your ' || equipment_record.name || ' from ' || NEW.start_date || ' to ' || NEW.end_date || '.',
    NEW.id,
    'booking'
  );
  
  RETURN NEW;
END;
$$;

-- Attach trigger for new bookings
CREATE TRIGGER on_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();