-- Create reconciliation_reports table
CREATE TABLE public.reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('tax_summary', 'adjustments', 'evidence_exceptions')),
  tax_type TEXT NOT NULL CHECK (tax_type IN ('income', 'presumptive', 'paye', 'vat')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  pdf_url TEXT,
  excel_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;

-- SME Owners: Full access to their own business reports
CREATE POLICY "Owners can view their business reports"
ON public.reconciliation_reports
FOR SELECT
USING (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Owners can create reports for their businesses"
ON public.reconciliation_reports
FOR INSERT
WITH CHECK (is_business_owner(auth.uid(), business_id) AND generated_by = auth.uid());

CREATE POLICY "Owners can update their business reports"
ON public.reconciliation_reports
FOR UPDATE
USING (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Owners can delete their business reports"
ON public.reconciliation_reports
FOR DELETE
USING (is_business_owner(auth.uid(), business_id));

-- Accountants: View and create for assigned businesses
CREATE POLICY "Accountants can view assigned business reports"
ON public.reconciliation_reports
FOR SELECT
USING (is_assigned_accountant(auth.uid(), business_id));

CREATE POLICY "Accountants can create reports for assigned businesses"
ON public.reconciliation_reports
FOR INSERT
WITH CHECK (is_assigned_accountant(auth.uid(), business_id) AND generated_by = auth.uid());

-- Admins: Full access
CREATE POLICY "Admins can view all reports"
ON public.reconciliation_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all reports"
ON public.reconciliation_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for report exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reconciliation-reports', 'reconciliation-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reconciliation-reports bucket
CREATE POLICY "Owners can view their report files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reconciliation-reports' 
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = b.id::text
  )
);

CREATE POLICY "Accountants can view assigned business report files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reconciliation-reports' 
  AND EXISTS (
    SELECT 1 FROM public.business_accountants ba
    WHERE ba.accountant_id = auth.uid()
    AND (storage.foldername(name))[1] = ba.business_id::text
  )
);

CREATE POLICY "Owners can upload report files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reconciliation-reports' 
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.owner_id = auth.uid()
    AND (storage.foldername(name))[1] = b.id::text
  )
);

CREATE POLICY "Accountants can upload report files for assigned businesses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reconciliation-reports' 
  AND EXISTS (
    SELECT 1 FROM public.business_accountants ba
    WHERE ba.accountant_id = auth.uid()
    AND (storage.foldername(name))[1] = ba.business_id::text
  )
);

CREATE POLICY "Admins can access all report files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'reconciliation-reports' 
  AND has_role(auth.uid(), 'admin')
);