-- Create income table
CREATE TABLE public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  income_date DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('sales', 'services', 'contracts', 'grants', 'other')),
  source_name TEXT,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'mobile_money', 'other')),
  tax_period TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create income_documents table
CREATE TABLE public.income_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID NOT NULL REFERENCES public.income(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Create income_audit_trail table
CREATE TABLE public.income_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID NOT NULL REFERENCES public.income(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  previous_values JSONB,
  new_values JSONB,
  change_summary TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create helper function for income access
CREATE OR REPLACE FUNCTION public.can_access_income(_user_id uuid, _income_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.income i
    JOIN public.businesses b ON b.id = i.business_id
    WHERE i.id = _income_id 
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

-- RLS Policies for income table
CREATE POLICY "Owners can view their business income"
ON public.income FOR SELECT
USING (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Accountants can view assigned business income"
ON public.income FOR SELECT
USING (is_assigned_accountant(auth.uid(), business_id));

CREATE POLICY "Admins can view all income"
ON public.income FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can create income for their businesses"
ON public.income FOR INSERT
WITH CHECK (is_business_owner(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Accountants with edit can create income"
ON public.income FOR INSERT
WITH CHECK (can_accountant_edit(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Owners can update unlocked income"
ON public.income FOR UPDATE
USING (is_business_owner(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Accountants with edit can update unlocked income"
ON public.income FOR UPDATE
USING (can_accountant_edit(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Admins can update all income"
ON public.income FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete unlocked income"
ON public.income FOR DELETE
USING (is_business_owner(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Admins can delete income"
ON public.income FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for income_documents table
CREATE POLICY "Users can view documents for accessible income"
ON public.income_documents FOR SELECT
USING (can_access_income(auth.uid(), income_id));

CREATE POLICY "Owners can insert income documents"
ON public.income_documents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM income i
  JOIN businesses b ON b.id = i.business_id
  WHERE i.id = income_documents.income_id AND b.owner_id = auth.uid()
));

CREATE POLICY "Accountants with upload can insert income documents"
ON public.income_documents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM income i
  WHERE i.id = income_documents.income_id AND can_accountant_upload(auth.uid(), i.business_id)
));

CREATE POLICY "Users can delete their own income documents"
ON public.income_documents FOR DELETE
USING (uploaded_by = auth.uid() OR EXISTS (
  SELECT 1 FROM income i
  JOIN businesses b ON b.id = i.business_id
  WHERE i.id = income_documents.income_id AND b.owner_id = auth.uid()
));

-- RLS Policies for income_audit_trail table
CREATE POLICY "Users can view audit trail for accessible income"
ON public.income_audit_trail FOR SELECT
USING (can_access_income(auth.uid(), income_id));

CREATE POLICY "Authenticated users can insert audit trail entries"
ON public.income_audit_trail FOR INSERT
WITH CHECK (changed_by = auth.uid());

CREATE POLICY "Accountants can add notes for assigned business income"
ON public.income_audit_trail FOR INSERT
WITH CHECK (
  action = 'note_added' 
  AND changed_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM income i
    WHERE i.id = income_audit_trail.income_id 
    AND is_assigned_accountant(auth.uid(), i.business_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_income_updated_at
BEFORE UPDATE ON public.income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for income documents
INSERT INTO storage.buckets (id, name, public) VALUES ('income-documents', 'income-documents', false);

-- Storage policies for income-documents bucket
CREATE POLICY "Users can view income documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'income-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload income documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'income-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own income documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'income-documents' AND auth.role() = 'authenticated');