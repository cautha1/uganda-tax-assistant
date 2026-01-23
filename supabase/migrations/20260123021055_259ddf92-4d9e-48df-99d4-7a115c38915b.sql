-- Create access_requests table for accountant-to-business access requests
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  UNIQUE (business_id, accountant_id)
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Accountants can create requests (must be an accountant role)
CREATE POLICY "Accountants can create access requests"
ON public.access_requests
FOR INSERT
WITH CHECK (
  accountant_id = auth.uid() 
  AND has_role(auth.uid(), 'accountant')
);

-- Accountants can view their own requests
CREATE POLICY "Accountants can view own requests"
ON public.access_requests
FOR SELECT
USING (accountant_id = auth.uid());

-- Business owners can view requests for their businesses
CREATE POLICY "Owners can view requests for their businesses"
ON public.access_requests
FOR SELECT
USING (is_business_owner(auth.uid(), business_id));

-- Business owners can update (approve/reject) requests for their businesses
CREATE POLICY "Owners can update requests for their businesses"
ON public.access_requests
FOR UPDATE
USING (is_business_owner(auth.uid(), business_id));

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.access_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all requests
CREATE POLICY "Admins can update all requests"
ON public.access_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_access_requests_business_id ON public.access_requests(business_id);
CREATE INDEX idx_access_requests_accountant_id ON public.access_requests(accountant_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);