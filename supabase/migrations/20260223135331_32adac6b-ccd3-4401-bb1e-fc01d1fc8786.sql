-- Update get_masked_contact to look up contact_number from the database
-- instead of accepting it as a parameter (prevents frontend from needing raw contact)
CREATE OR REPLACE FUNCTION public.get_masked_contact(contact text, equipment_owner_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_contact text;
BEGIN
  -- Look up the actual contact number from equipment table
  SELECT e.contact_number INTO actual_contact
  FROM public.equipment e
  WHERE e.owner_id = equipment_owner_id
  LIMIT 1;
  
  IF actual_contact IS NULL THEN
    RETURN '**********';
  END IF;

  -- Owner always sees full contact
  IF auth.uid() = equipment_owner_id THEN
    RETURN actual_contact;
  END IF;
  
  -- Authenticated users with confirmed/pending bookings see full contact
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.equipment e ON b.equipment_id = e.id
    WHERE e.owner_id = equipment_owner_id
    AND b.user_id = auth.uid()
    AND b.status IN ('pending', 'confirmed')
  ) THEN
    RETURN actual_contact;
  END IF;
  
  -- Others see masked version
  IF length(actual_contact) > 4 THEN
    RETURN substring(actual_contact, 1, 2) || '******' || substring(actual_contact, length(actual_contact) - 1);
  END IF;
  
  RETURN '**********';
END;
$$;