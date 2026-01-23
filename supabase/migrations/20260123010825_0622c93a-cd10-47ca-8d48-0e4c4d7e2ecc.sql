-- Phase 1: Granular Permission Model for Accountants

-- Add permission columns to existing business_accountants table
ALTER TABLE public.business_accountants
ADD COLUMN IF NOT EXISTS can_view boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_upload boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_generate_reports boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id);

-- Create helper function to get accountant permissions
CREATE OR REPLACE FUNCTION public.get_accountant_permissions(_user_id uuid, _business_id uuid)
RETURNS TABLE (
  can_view boolean,
  can_edit boolean,
  can_upload boolean,
  can_generate_reports boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT can_view, can_edit, can_upload, can_generate_reports
  FROM public.business_accountants
  WHERE accountant_id = _user_id AND business_id = _business_id
  LIMIT 1
$$;

-- Create function to check if accountant can edit forms
CREATE OR REPLACE FUNCTION public.can_accountant_edit(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accountants
    WHERE accountant_id = _user_id 
    AND business_id = _business_id
    AND can_edit = true
  )
$$;

-- Create function to check if accountant can upload documents
CREATE OR REPLACE FUNCTION public.can_accountant_upload(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accountants
    WHERE accountant_id = _user_id 
    AND business_id = _business_id
    AND can_upload = true
  )
$$;

-- Update tax_forms UPDATE policy for accountants to check can_edit permission
DROP POLICY IF EXISTS "Accountants can update assigned tax forms" ON public.tax_forms;
CREATE POLICY "Accountants can update assigned tax forms" 
ON public.tax_forms 
FOR UPDATE 
USING (
  can_accountant_edit(auth.uid(), business_id)
  AND status IN ('draft', 'validated') -- Can only edit draft or validated forms
);

-- Update tax_form_documents INSERT policy to check can_upload permission
DROP POLICY IF EXISTS "Users can insert documents for accessible tax forms" ON public.tax_form_documents;
CREATE POLICY "Users can insert documents for accessible tax forms" 
ON public.tax_form_documents 
FOR INSERT 
WITH CHECK (
  -- Business owners can always upload
  EXISTS (
    SELECT 1 FROM tax_forms tf
    JOIN businesses b ON b.id = tf.business_id
    WHERE tf.id = tax_form_id AND b.owner_id = auth.uid()
  )
  OR
  -- Accountants need can_upload permission
  EXISTS (
    SELECT 1 FROM tax_forms tf
    WHERE tf.id = tax_form_id 
    AND can_accountant_upload(auth.uid(), tf.business_id)
  )
  OR
  -- Admins can always upload
  has_role(auth.uid(), 'admin')
);

-- Add audit fields to tax_forms for tracking who submitted
ALTER TABLE public.tax_forms
ADD COLUMN IF NOT EXISTS risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS ready_for_submission boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ready_marked_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ready_marked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS audit_notes text,
ADD COLUMN IF NOT EXISTS due_date date;

-- Create tax_form_comments table for collaboration
CREATE TABLE IF NOT EXISTS public.tax_form_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  field_name text, -- NULL for general comments
  comment text NOT NULL,
  comment_type text NOT NULL DEFAULT 'note' CHECK (comment_type IN ('note', 'question', 'issue', 'resolution')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone
);

-- Enable RLS on comments
ALTER TABLE public.tax_form_comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view comments for accessible forms"
ON public.tax_form_comments
FOR SELECT
USING (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can create comments for accessible forms"
ON public.tax_form_comments
FOR INSERT
WITH CHECK (
  can_access_tax_form(auth.uid(), tax_form_id)
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.tax_form_comments
FOR UPDATE
USING (created_by = auth.uid() OR can_access_tax_form(auth.uid(), tax_form_id));

-- Create tax_form_versions table for version history
CREATE TABLE IF NOT EXISTS public.tax_form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  form_data jsonb NOT NULL,
  calculated_tax numeric,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  change_summary text,
  UNIQUE(tax_form_id, version_number)
);

-- Enable RLS on versions
ALTER TABLE public.tax_form_versions ENABLE ROW LEVEL SECURITY;

-- Versions policies
CREATE POLICY "Users can view versions for accessible forms"
ON public.tax_form_versions
FOR SELECT
USING (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can create versions for accessible forms"
ON public.tax_form_versions
FOR INSERT
WITH CHECK (can_access_tax_form(auth.uid(), tax_form_id));

-- Create compliance_checks table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'warning', 'failed')),
  message text NOT NULL,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on compliance_checks
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

-- Compliance checks policies
CREATE POLICY "Users can view checks for accessible forms"
ON public.compliance_checks
FOR SELECT
USING (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can create checks for accessible forms"
ON public.compliance_checks
FOR INSERT
WITH CHECK (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can update checks for accessible forms"
ON public.compliance_checks
FOR UPDATE
USING (can_access_tax_form(auth.uid(), tax_form_id));