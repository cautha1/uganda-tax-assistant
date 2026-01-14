-- Create helper function to check if user is business owner (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = _user_id
  )
$$;

-- Create helper function to check if user is assigned accountant (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_assigned_accountant(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accountants
    WHERE business_id = _business_id AND accountant_id = _user_id
  )
$$;

-- Drop problematic policies on businesses table
DROP POLICY IF EXISTS "Accountants can view assigned businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their businesses" ON public.businesses;

-- Recreate owner policy (simple, no subquery needed)
CREATE POLICY "Owners can view their businesses"
  ON public.businesses
  FOR SELECT
  USING (owner_id = auth.uid() AND (is_deleted IS NULL OR NOT is_deleted));

-- Recreate accountant policy using SECURITY DEFINER function
CREATE POLICY "Accountants can view assigned businesses"
  ON public.businesses
  FOR SELECT
  USING (
    public.is_assigned_accountant(auth.uid(), id) 
    AND (is_deleted IS NULL OR NOT is_deleted)
  );

-- Drop and recreate business_accountants policy using SECURITY DEFINER function
DROP POLICY IF EXISTS "Business owners can manage accountants" ON public.business_accountants;

CREATE POLICY "Business owners can manage accountants"
  ON public.business_accountants
  FOR ALL
  USING (public.is_business_owner(auth.uid(), business_id));