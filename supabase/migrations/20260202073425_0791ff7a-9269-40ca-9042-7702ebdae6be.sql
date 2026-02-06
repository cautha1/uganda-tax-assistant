-- =============================================
-- SECURITY FIX: Address 4 critical vulnerabilities
-- =============================================

-- =============================================
-- 1. FIX search_existing_profiles RPC - Remove NIN from results
-- and only allow users to search their OWN profile (not enumerate others)
-- =============================================
CREATE OR REPLACE FUNCTION public.search_existing_profiles(search_term text)
RETURNS TABLE (id uuid, name text, email text, nin text, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return the CURRENT USER's profile if it matches the search
  -- This prevents enumeration of other users' data
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    -- Return masked NIN only (first 4 + **** + last 2) for privacy
    CASE 
      WHEN p.nin IS NOT NULL AND length(p.nin) > 6 
      THEN substring(p.nin from 1 for 4) || '****' || substring(p.nin from length(p.nin) - 1)
      ELSE p.nin
    END as nin,
    -- Return masked phone (first 4 + **** + last 2)
    CASE 
      WHEN p.phone IS NOT NULL AND length(p.phone) > 6 
      THEN substring(p.phone from 1 for 4) || '****' || substring(p.phone from length(p.phone) - 1)
      ELSE p.phone
    END as phone
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND (
      p.email ILIKE '%' || search_term || '%'
      OR p.phone ILIKE '%' || search_term || '%'
      OR p.name ILIKE '%' || search_term || '%'
      OR p.nin ILIKE '%' || search_term || '%'
    );
END;
$$;

-- =============================================
-- 2. FIX Storage Policies - submission-proofs bucket
-- Drop existing overly permissive policies
-- =============================================
DROP POLICY IF EXISTS "Users can view own submission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload submission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own submission proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own submission proofs" ON storage.objects;

-- Create secure SELECT policy for submission-proofs
CREATE POLICY "Secure view submission proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submission-proofs' AND 
  auth.uid() IS NOT NULL AND
  (
    -- Owner can access their business files (folder structure: business_id/form_id/file)
    (storage.foldername(name))[1]::uuid IN (
      SELECT b.id FROM public.businesses b
      WHERE b.owner_id = auth.uid() AND (b.is_deleted IS NULL OR NOT b.is_deleted)
    )
    OR
    -- Accountants can access assigned business files
    (storage.foldername(name))[1]::uuid IN (
      SELECT ba.business_id FROM public.business_accountants ba
      WHERE ba.accountant_id = auth.uid()
    )
    OR
    -- Admins can access all
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure INSERT policy for submission-proofs
CREATE POLICY "Secure upload submission proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submission-proofs' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT b.id FROM public.businesses b
      WHERE b.owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT ba.business_id FROM public.business_accountants ba
      WHERE ba.accountant_id = auth.uid() AND ba.can_upload = true
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure UPDATE policy for submission-proofs
CREATE POLICY "Secure update submission proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'submission-proofs' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT b.id FROM public.businesses b
      WHERE b.owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT ba.business_id FROM public.business_accountants ba
      WHERE ba.accountant_id = auth.uid() AND ba.can_upload = true
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure DELETE policy for submission-proofs
CREATE POLICY "Secure delete submission proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submission-proofs' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT b.id FROM public.businesses b
      WHERE b.owner_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- =============================================
-- 3. FIX Storage Policies - expense-documents bucket
-- =============================================
DROP POLICY IF EXISTS "Users can view expense documents they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload expense documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete expense documents" ON storage.objects;

-- Create secure SELECT policy for expense-documents
CREATE POLICY "Secure view expense documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'expense-documents' AND 
  auth.uid() IS NOT NULL AND
  (
    -- Owner can access expense docs (folder structure: expense_id/file)
    (storage.foldername(name))[1]::uuid IN (
      SELECT e.id FROM public.expenses e
      JOIN public.businesses b ON e.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    -- Accountants can access assigned business expense docs
    (storage.foldername(name))[1]::uuid IN (
      SELECT e.id FROM public.expenses e
      JOIN public.business_accountants ba ON e.business_id = ba.business_id
      WHERE ba.accountant_id = auth.uid()
    )
    OR
    -- Admins can access all
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure INSERT policy for expense-documents
CREATE POLICY "Secure upload expense documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-documents' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT e.id FROM public.expenses e
      JOIN public.businesses b ON e.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT e.id FROM public.expenses e
      JOIN public.business_accountants ba ON e.business_id = ba.business_id
      WHERE ba.accountant_id = auth.uid() AND ba.can_upload = true
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure DELETE policy for expense-documents
CREATE POLICY "Secure delete expense documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expense-documents' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT e.id FROM public.expenses e
      JOIN public.businesses b ON e.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- =============================================
-- 4. FIX Storage Policies - income-documents bucket  
-- (Apply same security pattern for consistency)
-- =============================================
DROP POLICY IF EXISTS "Users can view income documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload income documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete income documents" ON storage.objects;

-- Create secure SELECT policy for income-documents
CREATE POLICY "Secure view income documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'income-documents' AND 
  auth.uid() IS NOT NULL AND
  (
    -- Owner can access income docs
    (storage.foldername(name))[1]::uuid IN (
      SELECT i.id FROM public.income i
      JOIN public.businesses b ON i.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    -- Accountants can access assigned business income docs
    (storage.foldername(name))[1]::uuid IN (
      SELECT i.id FROM public.income i
      JOIN public.business_accountants ba ON i.business_id = ba.business_id
      WHERE ba.accountant_id = auth.uid()
    )
    OR
    -- Admins can access all
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure INSERT policy for income-documents
CREATE POLICY "Secure upload income documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'income-documents' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT i.id FROM public.income i
      JOIN public.businesses b ON i.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT i.id FROM public.income i
      JOIN public.business_accountants ba ON i.business_id = ba.business_id
      WHERE ba.accountant_id = auth.uid() AND ba.can_upload = true
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Create secure DELETE policy for income-documents
CREATE POLICY "Secure delete income documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'income-documents' AND
  auth.uid() IS NOT NULL AND
  (
    (storage.foldername(name))[1]::uuid IN (
      SELECT i.id FROM public.income i
      JOIN public.businesses b ON i.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'admin')
  )
);