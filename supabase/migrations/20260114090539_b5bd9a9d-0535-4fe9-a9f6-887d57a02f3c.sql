-- Create tax_forms table for storing tax filings
CREATE TABLE public.tax_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tax_type public.tax_type NOT NULL,
  tax_period text NOT NULL, -- e.g., "2025-Q1", "2025-01", "2024"
  status public.tax_form_status NOT NULL DEFAULT 'draft',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_errors jsonb DEFAULT NULL,
  calculated_tax numeric DEFAULT 0,
  submitted_at timestamp with time zone DEFAULT NULL,
  submitted_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tax_forms ENABLE ROW LEVEL SECURITY;

-- Create helper function for tax_forms access (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.can_access_tax_form(_user_id uuid, _form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tax_forms tf
    JOIN public.businesses b ON b.id = tf.business_id
    WHERE tf.id = _form_id 
    AND (
      b.owner_id = _user_id 
      OR EXISTS (
        SELECT 1 FROM public.business_accountants ba 
        WHERE ba.business_id = b.id AND ba.accountant_id = _user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = _user_id AND ur.role = 'admin'
      )
    )
  )
$$;

-- RLS Policies for tax_forms

-- Business owners can view their tax forms
CREATE POLICY "Owners can view their tax forms"
  ON public.tax_forms
  FOR SELECT
  USING (
    public.is_business_owner(auth.uid(), business_id)
  );

-- Accountants can view assigned business tax forms
CREATE POLICY "Accountants can view assigned tax forms"
  ON public.tax_forms
  FOR SELECT
  USING (
    public.is_assigned_accountant(auth.uid(), business_id)
  );

-- Admins can view all tax forms
CREATE POLICY "Admins can view all tax forms"
  ON public.tax_forms
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Business owners can create tax forms
CREATE POLICY "Owners can create tax forms"
  ON public.tax_forms
  FOR INSERT
  WITH CHECK (
    public.is_business_owner(auth.uid(), business_id)
  );

-- Accountants can create tax forms for assigned businesses
CREATE POLICY "Accountants can create tax forms"
  ON public.tax_forms
  FOR INSERT
  WITH CHECK (
    public.is_assigned_accountant(auth.uid(), business_id)
  );

-- Business owners can update their tax forms
CREATE POLICY "Owners can update their tax forms"
  ON public.tax_forms
  FOR UPDATE
  USING (
    public.is_business_owner(auth.uid(), business_id)
  );

-- Accountants can update assigned business tax forms
CREATE POLICY "Accountants can update assigned tax forms"
  ON public.tax_forms
  FOR UPDATE
  USING (
    public.is_assigned_accountant(auth.uid(), business_id)
  );

-- Admins can update any tax form
CREATE POLICY "Admins can update all tax forms"
  ON public.tax_forms
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_tax_forms_updated_at
  BEFORE UPDATE ON public.tax_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for performance
CREATE INDEX idx_tax_forms_business_id ON public.tax_forms(business_id);
CREATE INDEX idx_tax_forms_status ON public.tax_forms(status);
CREATE INDEX idx_tax_forms_tax_type ON public.tax_forms(tax_type);