-- Fix 1: Restrict profiles table to only allow users to view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- But equipment owners and reviewers need to be visible, so create a policy for that
CREATE POLICY "Users can view equipment owner profiles" ON public.profiles
  FOR SELECT USING (
    id IN (SELECT owner_id FROM public.equipment WHERE status = 'approved')
  );

-- Fix 2: Create a function to mask contact numbers for unauthenticated users
-- Authenticated users who are interested (have bookings or are the owner) can see full contact
CREATE OR REPLACE FUNCTION public.get_masked_contact(contact text, equipment_owner_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner always sees full contact
  IF auth.uid() = equipment_owner_id THEN
    RETURN contact;
  END IF;
  
  -- Authenticated users with confirmed/pending bookings see full contact
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.equipment e ON b.equipment_id = e.id
    WHERE e.owner_id = equipment_owner_id
    AND b.user_id = auth.uid()
    AND b.status IN ('pending', 'confirmed')
  ) THEN
    RETURN contact;
  END IF;
  
  -- Others see masked version
  IF length(contact) > 4 THEN
    RETURN substring(contact, 1, 2) || '******' || substring(contact, length(contact) - 1);
  END IF;
  
  RETURN '**********';
END;
$$;