-- Create the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add columns to tax_forms table for submission proof
ALTER TABLE public.tax_forms 
ADD COLUMN IF NOT EXISTS submission_proof_url TEXT,
ADD COLUMN IF NOT EXISTS ura_acknowledgement_number TEXT,
ADD COLUMN IF NOT EXISTS ura_submission_date TIMESTAMPTZ;

-- Create tax_payments table
CREATE TABLE public.tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id UUID NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  payment_date TIMESTAMPTZ,
  payment_proof_url TEXT,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'partial', 'paid', 'overdue'))
);

-- Enable RLS on tax_payments
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for tax_payments
CREATE POLICY "Users can view payments for accessible tax forms"
ON public.tax_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tax_forms tf
    JOIN public.businesses b ON tf.business_id = b.id
    WHERE tf.id = tax_form_id 
    AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.business_accountants ba 
      WHERE ba.business_id = b.id AND ba.accountant_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert payments for accessible tax forms"
ON public.tax_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tax_forms tf
    JOIN public.businesses b ON tf.business_id = b.id
    WHERE tf.id = tax_form_id 
    AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.business_accountants ba 
      WHERE ba.business_id = b.id AND ba.accountant_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update payments for accessible tax forms"
ON public.tax_payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tax_forms tf
    JOIN public.businesses b ON tf.business_id = b.id
    WHERE tf.id = tax_form_id 
    AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.business_accountants ba 
      WHERE ba.business_id = b.id AND ba.accountant_id = auth.uid()
    ))
  )
);

-- Create trigger for updated_at on tax_payments
CREATE TRIGGER update_tax_payments_updated_at
BEFORE UPDATE ON public.tax_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for submission proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submission-proofs', 'submission-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for submission proofs
CREATE POLICY "Users can upload submission proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submission-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own submission proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'submission-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own submission proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'submission-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own submission proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'submission-proofs' AND auth.uid() IS NOT NULL);