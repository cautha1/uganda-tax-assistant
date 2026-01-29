-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Create accountant_invitations table
CREATE TABLE public.accountant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  accountant_email TEXT NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  token_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{"can_view": true, "can_edit": true, "can_upload": true, "can_generate_reports": true}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  token_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID
);

-- Create index for token lookup
CREATE INDEX idx_accountant_invitations_token_hash ON public.accountant_invitations(token_hash);

-- Create index for email lookup
CREATE INDEX idx_accountant_invitations_email ON public.accountant_invitations(LOWER(accountant_email));

-- Create index for business lookup
CREATE INDEX idx_accountant_invitations_business ON public.accountant_invitations(business_id);

-- Enable RLS
ALTER TABLE public.accountant_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view invitations for their businesses
CREATE POLICY "Owners can view invitations for their businesses"
ON public.accountant_invitations
FOR SELECT
USING (is_business_owner(auth.uid(), business_id));

-- Policy: Business owners can create invitations for their businesses
CREATE POLICY "Owners can create invitations for their businesses"
ON public.accountant_invitations
FOR INSERT
WITH CHECK (is_business_owner(auth.uid(), business_id) AND created_by = auth.uid());

-- Policy: Business owners can update invitations for their businesses (for revoke)
CREATE POLICY "Owners can update invitations for their businesses"
ON public.accountant_invitations
FOR UPDATE
USING (is_business_owner(auth.uid(), business_id));

-- Policy: Admins can manage all invitations
CREATE POLICY "Admins can manage all invitations"
ON public.accountant_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Policy: Accountants can view invitations sent to their email
CREATE POLICY "Accountants can view invitations to their email"
ON public.accountant_invitations
FOR SELECT
USING (
  LOWER(accountant_email) = LOWER((SELECT email FROM public.profiles WHERE id = auth.uid()))
);

-- Add comment for documentation
COMMENT ON TABLE public.accountant_invitations IS 'Stores secure invitations for accountants to join businesses with cryptographically hashed tokens';