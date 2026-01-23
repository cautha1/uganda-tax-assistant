-- Create a function to check if a user is a registered accountant by email
-- This uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.lookup_accountant_by_email(lookup_email text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  is_accountant boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.name,
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.id AND ur.role = 'accountant'
    ) as is_accountant
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(lookup_email)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'accountant'
  )
$$;