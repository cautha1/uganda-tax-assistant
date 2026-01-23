-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'transport', 'supplies', 'salaries', 'other')),
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'mobile_money', 'other')),
  tax_period TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense_documents table
CREATE TABLE public.expense_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expense_audit_trail table (immutable)
CREATE TABLE public.expense_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'document_uploaded', 'document_deleted', 'locked', 'adjustment')),
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  previous_values JSONB,
  new_values JSONB,
  change_summary TEXT
);

-- Create storage bucket for expense documents
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-documents', 'expense-documents', false);

-- Enable RLS on all tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_trail ENABLE ROW LEVEL SECURITY;

-- Helper function to check expense access
CREATE OR REPLACE FUNCTION public.can_access_expense(_user_id uuid, _expense_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = _expense_id 
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

-- RLS Policies for expenses
CREATE POLICY "Owners can view their business expenses"
ON public.expenses FOR SELECT
USING (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Accountants can view assigned business expenses"
ON public.expenses FOR SELECT
USING (is_assigned_accountant(auth.uid(), business_id));

CREATE POLICY "Admins can view all expenses"
ON public.expenses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can create expenses for their businesses"
ON public.expenses FOR INSERT
WITH CHECK (is_business_owner(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Accountants with edit can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (can_accountant_edit(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Owners can update unlocked expenses"
ON public.expenses FOR UPDATE
USING (is_business_owner(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Accountants with edit can update unlocked expenses"
ON public.expenses FOR UPDATE
USING (can_accountant_edit(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Admins can update all expenses"
ON public.expenses FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can delete unlocked expenses"
ON public.expenses FOR DELETE
USING (is_business_owner(auth.uid(), business_id) AND NOT is_locked);

CREATE POLICY "Admins can delete expenses"
ON public.expenses FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for expense_documents
CREATE POLICY "Users can view documents for accessible expenses"
ON public.expense_documents FOR SELECT
USING (can_access_expense(auth.uid(), expense_id));

CREATE POLICY "Owners can insert expense documents"
ON public.expense_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = expense_documents.expense_id AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Accountants with upload can insert expense documents"
ON public.expense_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_documents.expense_id AND can_accountant_upload(auth.uid(), e.business_id)
  )
);

CREATE POLICY "Users can delete their own expense documents"
ON public.expense_documents FOR DELETE
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.businesses b ON b.id = e.business_id
    WHERE e.id = expense_documents.expense_id AND b.owner_id = auth.uid()
  )
);

-- RLS Policies for expense_audit_trail (INSERT only - immutable)
CREATE POLICY "Users can view audit trail for accessible expenses"
ON public.expense_audit_trail FOR SELECT
USING (can_access_expense(auth.uid(), expense_id));

CREATE POLICY "Authenticated users can insert audit trail entries"
ON public.expense_audit_trail FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- Storage policies for expense-documents bucket
CREATE POLICY "Users can view expense documents they have access to"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload expense documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their expense documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-documents' AND auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();