-- Update expense_audit_trail to support accountant notes
-- First drop any existing constraint
ALTER TABLE public.expense_audit_trail 
  DROP CONSTRAINT IF EXISTS expense_audit_trail_action_check;

-- Add RLS policy for accountants to add notes for assigned business expenses
CREATE POLICY "Accountants can add notes for assigned business expenses"
ON public.expense_audit_trail FOR INSERT
WITH CHECK (
  action = 'note_added' AND
  changed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_audit_trail.expense_id
    AND is_assigned_accountant(auth.uid(), e.business_id)
  )
);