-- Create table for multiple supporting documents per tax form
CREATE TABLE public.tax_form_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id UUID NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  document_type TEXT DEFAULT 'other',
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tax_form_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents for accessible tax forms"
ON public.tax_form_documents
FOR SELECT
USING (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can insert documents for accessible tax forms"
ON public.tax_form_documents
FOR INSERT
WITH CHECK (can_access_tax_form(auth.uid(), tax_form_id));

CREATE POLICY "Users can delete their own uploaded documents"
ON public.tax_form_documents
FOR DELETE
USING (uploaded_by = auth.uid() OR EXISTS (
  SELECT 1 FROM public.tax_forms tf
  JOIN public.businesses b ON b.id = tf.business_id
  WHERE tf.id = tax_form_id AND b.owner_id = auth.uid()
));