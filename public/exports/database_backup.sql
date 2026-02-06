-- ============================================================
-- SME TAX AID - COMPLETE DATABASE BACKUP
-- Generated: 2026-01-30
-- Project: lczhmunngjimkfankful
-- ============================================================

-- ============================================================
-- PART 1: ENUMS (Custom Types)
-- ============================================================

-- Drop existing enums if recreating (uncomment if needed)
-- DROP TYPE IF EXISTS public.app_role CASCADE;
-- DROP TYPE IF EXISTS public.business_type CASCADE;
-- DROP TYPE IF EXISTS public.tax_type CASCADE;
-- DROP TYPE IF EXISTS public.tax_form_status CASCADE;
-- DROP TYPE IF EXISTS public.invitation_status CASCADE;
-- DROP TYPE IF EXISTS public.feedback_type CASCADE;

CREATE TYPE public.app_role AS ENUM ('sme_owner', 'accountant', 'admin', 'guest');

CREATE TYPE public.business_type AS ENUM (
  'sole_proprietorship',
  'partnership',
  'limited_company',
  'ngo',
  'cooperative',
  'other'
);

CREATE TYPE public.tax_type AS ENUM ('paye', 'income', 'presumptive', 'vat', 'other');

CREATE TYPE public.tax_form_status AS ENUM ('draft', 'validated', 'error', 'submitted');

CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TYPE public.feedback_type AS ENUM ('challenge', 'solution', 'general');


-- ============================================================
-- PART 2: TABLE DEFINITIONS
-- ============================================================

-- Profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  nin text,
  verified boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'guest'::app_role,
  UNIQUE (user_id, role)
);

-- Businesses table
CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid,
  name text NOT NULL,
  tin text,
  tin_verified boolean DEFAULT false,
  business_type public.business_type DEFAULT 'sole_proprietorship'::business_type,
  address text,
  turnover numeric DEFAULT 0,
  annual_turnover numeric DEFAULT 0,
  tax_types public.tax_type[] DEFAULT '{}'::tax_type[],
  is_informal boolean DEFAULT false,
  informal_acknowledged boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_nin text,
  ura_tin_password text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Business accountants table
CREATE TABLE public.business_accountants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT true,
  can_generate_reports boolean NOT NULL DEFAULT true,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now()
);

-- Access requests table
CREATE TABLE public.access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accountant_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text
);

-- Accountant invitations table
CREATE TABLE public.accountant_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  accountant_email text NOT NULL,
  token_hash text NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending'::invitation_status,
  permissions jsonb NOT NULL DEFAULT '{"can_edit": true, "can_view": true, "can_upload": true, "can_generate_reports": true}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  accepted_by uuid,
  token_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  revoked_by uuid
);

-- Expenses table
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  expense_date date NOT NULL,
  payment_method text NOT NULL,
  tax_period text NOT NULL,
  is_locked boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Expense documents table
CREATE TABLE public.expense_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Expense audit trail table
CREATE TABLE public.expense_audit_trail (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  action text NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  change_summary text,
  changed_at timestamp with time zone DEFAULT now()
);

-- Income table
CREATE TABLE public.income (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  source text NOT NULL,
  source_name text,
  description text,
  income_date date NOT NULL,
  payment_method text NOT NULL,
  tax_period text NOT NULL,
  is_locked boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Income documents table
CREATE TABLE public.income_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id uuid NOT NULL REFERENCES public.income(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Income audit trail table
CREATE TABLE public.income_audit_trail (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_id uuid NOT NULL REFERENCES public.income(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  action text NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  change_summary text,
  changed_at timestamp with time zone DEFAULT now()
);

-- Tax forms table
CREATE TABLE public.tax_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tax_type public.tax_type NOT NULL,
  tax_period text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_tax numeric DEFAULT 0,
  status public.tax_form_status NOT NULL DEFAULT 'draft'::tax_form_status,
  validation_errors jsonb,
  ready_for_submission boolean NOT NULL DEFAULT false,
  ready_marked_by uuid,
  ready_marked_at timestamp with time zone,
  submitted_by uuid,
  submitted_at timestamp with time zone,
  submission_proof_url text,
  ura_submission_date timestamp with time zone,
  ura_acknowledgement_number text,
  due_date date,
  risk_level text,
  audit_notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tax form versions table
CREATE TABLE public.tax_form_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  form_data jsonb NOT NULL,
  calculated_tax numeric,
  changed_by uuid,
  change_summary text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tax form comments table
CREATE TABLE public.tax_form_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  comment text NOT NULL,
  comment_type text NOT NULL DEFAULT 'note'::text,
  field_name text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tax form documents table
CREATE TABLE public.tax_form_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_url text NOT NULL,
  document_type text DEFAULT 'other'::text,
  description text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tax payments table
CREATE TABLE public.tax_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  amount_due numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  status text DEFAULT 'pending'::text,
  due_date date,
  payment_date timestamp with time zone,
  payment_method text,
  payment_reference text,
  payment_proof_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Compliance checks table
CREATE TABLE public.compliance_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_form_id uuid NOT NULL REFERENCES public.tax_forms(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  checked_by uuid,
  checked_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);


-- ============================================================
-- PART 3: DATABASE FUNCTIONS
-- ============================================================

-- Has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Is business owner function
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = _user_id
  )
$$;

-- Is assigned accountant function
CREATE OR REPLACE FUNCTION public.is_assigned_accountant(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_accountants
    WHERE business_id = _business_id AND accountant_id = _user_id
  )
$$;

-- Can access business function
CREATE OR REPLACE FUNCTION public.can_access_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.business_accountants WHERE business_id = _business_id AND accountant_id = _user_id
  ) OR public.has_role(_user_id, 'admin')
$$;

-- Can accountant edit function
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

-- Can accountant upload function
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

-- Get accountant permissions function
CREATE OR REPLACE FUNCTION public.get_accountant_permissions(_user_id uuid, _business_id uuid)
RETURNS TABLE(can_view boolean, can_edit boolean, can_upload boolean, can_generate_reports boolean)
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

-- Can access expense function
CREATE OR REPLACE FUNCTION public.can_access_expense(_user_id uuid, _expense_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Can access income function
CREATE OR REPLACE FUNCTION public.can_access_income(_user_id uuid, _income_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Can access tax form function
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

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Validate TIN format function
CREATE OR REPLACE FUNCTION public.validate_tin_format(tin text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN tin ~ '^\d{10}$';
END;
$$;

-- Validate NIN format function
CREATE OR REPLACE FUNCTION public.validate_nin_format(nin text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN nin ~* '^CM[A-Z0-9]{12}$';
END;
$$;

-- Validate Uganda phone function
CREATE OR REPLACE FUNCTION public.validate_uganda_phone(phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN phone ~ '^(\+256|0)[0-9]{9}$';
END;
$$;

-- Lookup accountant by email function
CREATE OR REPLACE FUNCTION public.lookup_accountant_by_email(lookup_email text)
RETURNS TABLE(id uuid, email text, name text, is_accountant boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.name,
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.id AND ur.role = 'accountant'
    ) as is_accountant
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(lookup_email)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'accountant'
  )
$$;

-- Handle new user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
  role_text text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Read role from metadata, default to sme_owner if not specified
  role_text := NEW.raw_user_meta_data->>'role';
  
  IF role_text = 'accountant' THEN
    selected_role := 'accountant'::app_role;
  ELSE
    selected_role := 'sme_owner'::app_role;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$$;


-- ============================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_form_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_form_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 5: RLS POLICIES
-- ============================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view accountant profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.id AND user_roles.role = 'accountant'::app_role)
);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Businesses policies
CREATE POLICY "Owners can view their businesses" ON public.businesses FOR SELECT 
  USING ((owner_id = auth.uid()) AND ((is_deleted IS NULL) OR (NOT is_deleted)));
CREATE POLICY "Accountants can view assigned businesses" ON public.businesses FOR SELECT 
  USING (is_assigned_accountant(auth.uid(), id) AND ((is_deleted IS NULL) OR (NOT is_deleted)));
CREATE POLICY "Admins can view all businesses" ON public.businesses FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "SME owners and admins can create businesses" ON public.businesses FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'sme_owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners and admins can update businesses" ON public.businesses FOR UPDATE 
  USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Business accountants policies
CREATE POLICY "Accountants can view their assignments" ON public.business_accountants FOR SELECT 
  USING (accountant_id = auth.uid());
CREATE POLICY "Business owners can manage accountants" ON public.business_accountants FOR ALL 
  USING (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Admins can manage all accountants" ON public.business_accountants FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Expenses policies
CREATE POLICY "Owners can view their business expenses" ON public.expenses FOR SELECT 
  USING (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Accountants can view assigned business expenses" ON public.expenses FOR SELECT 
  USING (is_assigned_accountant(auth.uid(), business_id));
CREATE POLICY "Admins can view all expenses" ON public.expenses FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can create expenses for their businesses" ON public.expenses FOR INSERT 
  WITH CHECK (is_business_owner(auth.uid(), business_id) AND (created_by = auth.uid()));
CREATE POLICY "Accountants with edit can create expenses" ON public.expenses FOR INSERT 
  WITH CHECK (can_accountant_edit(auth.uid(), business_id) AND (created_by = auth.uid()));
CREATE POLICY "Owners can update unlocked expenses" ON public.expenses FOR UPDATE 
  USING (is_business_owner(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Accountants with edit can update unlocked expenses" ON public.expenses FOR UPDATE 
  USING (can_accountant_edit(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Admins can update all expenses" ON public.expenses FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can delete unlocked expenses" ON public.expenses FOR DELETE 
  USING (is_business_owner(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Income policies
CREATE POLICY "Owners can view their business income" ON public.income FOR SELECT 
  USING (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Accountants can view assigned business income" ON public.income FOR SELECT 
  USING (is_assigned_accountant(auth.uid(), business_id));
CREATE POLICY "Admins can view all income" ON public.income FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can create income for their businesses" ON public.income FOR INSERT 
  WITH CHECK (is_business_owner(auth.uid(), business_id) AND (created_by = auth.uid()));
CREATE POLICY "Accountants with edit can create income" ON public.income FOR INSERT 
  WITH CHECK (can_accountant_edit(auth.uid(), business_id) AND (created_by = auth.uid()));
CREATE POLICY "Owners can update unlocked income" ON public.income FOR UPDATE 
  USING (is_business_owner(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Accountants with edit can update unlocked income" ON public.income FOR UPDATE 
  USING (can_accountant_edit(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Admins can update all income" ON public.income FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can delete unlocked income" ON public.income FOR DELETE 
  USING (is_business_owner(auth.uid(), business_id) AND (NOT is_locked));
CREATE POLICY "Admins can delete income" ON public.income FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tax forms policies
CREATE POLICY "Owners can view their tax forms" ON public.tax_forms FOR SELECT 
  USING (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Accountants can view assigned tax forms" ON public.tax_forms FOR SELECT 
  USING (is_assigned_accountant(auth.uid(), business_id));
CREATE POLICY "Admins can view all tax forms" ON public.tax_forms FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can create tax forms" ON public.tax_forms FOR INSERT 
  WITH CHECK (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Accountants can create tax forms" ON public.tax_forms FOR INSERT 
  WITH CHECK (is_assigned_accountant(auth.uid(), business_id));
CREATE POLICY "Owners can update their tax forms" ON public.tax_forms FOR UPDATE 
  USING (is_business_owner(auth.uid(), business_id));
CREATE POLICY "Accountants can update assigned tax forms" ON public.tax_forms FOR UPDATE 
  USING (can_accountant_edit(auth.uid(), business_id) AND (status = ANY (ARRAY['draft'::tax_form_status, 'validated'::tax_form_status])));
CREATE POLICY "Admins can update all tax forms" ON public.tax_forms FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "Users can view business audit logs" ON public.audit_logs FOR SELECT 
  USING (can_access_business(auth.uid(), business_id));
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT 
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- PART 6: DATA INSERTS
-- ============================================================

-- Profiles data
INSERT INTO public.profiles (id, email, name, phone, nin, verified, onboarding_completed, created_at, updated_at) VALUES
('9018ca85-544c-47e7-a901-567d861037a7', 'cauthansanyu203@gmail.com', 'Cauthan Buluma', NULL, NULL, false, false, '2026-01-14 08:59:52.873563+00', '2026-01-14 08:59:52.873563+00'),
('08811677-c5ac-4276-b625-525d3df5ab1b', 'cauthan.buluma@student.tafesa.edu.au', 'Jane Naku', NULL, NULL, false, false, '2026-01-15 09:13:59.348166+00', '2026-01-15 09:13:59.348166+00'),
('32d5fadc-25a5-4bd7-8179-18ce3b7608ad', 'c.buluma@adelaide.edu.au', 'Stella', '0752649511', 'CM123654896541', false, true, '2026-01-21 12:17:35.159131+00', '2026-01-21 13:14:44.430402+00'),
('5419352e-e6a2-4c3d-9e21-95f84701f919', 'bulcy007@mymail.unisa.edu.au', 'Eva Jb', NULL, NULL, false, false, '2026-01-23 02:26:18.358099+00', '2026-01-23 02:26:18.358099+00'),
('2430c4f6-4d30-470a-8351-639828a0f297', 'phechanmonich096@gmail.com', 'Chanmonich Phe', NULL, NULL, false, false, '2026-01-26 03:06:17.175637+00', '2026-01-26 03:06:17.175637+00'),
('47e2fe4c-8dcc-42f7-80fe-9570ecff4be4', 'jnakaweesa09@gmail.com', 'Joy Nakaweesa', NULL, NULL, false, false, '2026-01-29 05:04:29.622985+00', '2026-01-29 05:04:29.622985+00'),
('7f4352d4-1c1f-4628-9434-249117fd34c4', 'chanmonich.phe@gmail.com', 'James Bond', NULL, NULL, false, false, '2026-01-29 06:38:49.237749+00', '2026-01-29 06:38:49.237749+00'),
('9e0dc520-639b-40b9-857e-8e7731a64e7b', 'joe.blue@hotmail.com', 'Joe Blue', '+256 000000000', 'CM000000000000', false, true, '2026-01-29 13:48:12.08493+00', '2026-01-29 13:52:55.298951+00')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  nin = EXCLUDED.nin,
  verified = EXCLUDED.verified,
  onboarding_completed = EXCLUDED.onboarding_completed;

-- User roles data
INSERT INTO public.user_roles (id, user_id, role) VALUES
('bfdcae4c-d312-4f8c-b257-776f89aac455', '9018ca85-544c-47e7-a901-567d861037a7', 'sme_owner'),
('65fc2e90-9739-414a-92ef-70fbc9274a72', '9018ca85-544c-47e7-a901-567d861037a7', 'admin'),
('c80dd725-93b9-4d6a-9b32-813e643ab6b9', '9018ca85-544c-47e7-a901-567d861037a7', 'accountant'),
('fc7c4720-d47d-49df-8608-5233c63370a4', '08811677-c5ac-4276-b625-525d3df5ab1b', 'sme_owner'),
('301375f1-a0d5-4f2e-a7ea-fe50915f3809', '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', 'sme_owner'),
('2453eccb-951d-49db-b07d-a20f567ca483', '5419352e-e6a2-4c3d-9e21-95f84701f919', 'accountant'),
('5b9992f9-4586-4e4c-964f-df5bbe340cb8', '2430c4f6-4d30-470a-8351-639828a0f297', 'sme_owner'),
('865fd03b-d8e3-4abb-9133-7c363f350bc5', '2430c4f6-4d30-470a-8351-639828a0f297', 'admin'),
('a0dac63b-ef85-4c75-8452-18bf483f29d7', '47e2fe4c-8dcc-42f7-80fe-9570ecff4be4', 'accountant'),
('1f062f56-1cd1-4d29-a854-45d0344b37bc', '7f4352d4-1c1f-4628-9434-249117fd34c4', 'sme_owner'),
('c4445e59-3527-445c-affd-d1b4d205b185', '9e0dc520-639b-40b9-857e-8e7731a64e7b', 'sme_owner')
ON CONFLICT (id) DO NOTHING;

-- Businesses data
INSERT INTO public.businesses (id, owner_id, name, tin, tin_verified, business_type, address, turnover, annual_turnover, tax_types, is_informal, informal_acknowledged, is_deleted, onboarding_completed, owner_name, owner_email, owner_phone, owner_nin, created_at, updated_at) VALUES
('ee1f0097-28d4-4267-8eae-7b5fc14277e6', '9018ca85-544c-47e7-a901-567d861037a7', 'Maize Farmer', '1200000000', false, 'limited_company', 'Kampala, Uganda', 2.00, 2.00, '{paye,income,presumptive,vat}', false, false, false, false, NULL, NULL, NULL, NULL, '2026-01-14 09:24:10.29815+00', '2026-01-15 09:27:28.075756+00'),
('2ba2ea7a-dfb8-467c-a888-788a6080d958', '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', 'Coffee Farmer', '2001234567', false, 'limited_company', 'Makasa', 400000.00, 400000, '{paye,income,vat}', false, false, false, true, 'Stella', 'c.buluma@adelaide.edu.au', '0752649511', 'CM123654896541', '2026-01-21 13:14:43.8293+00', '2026-01-21 13:23:20.538981+00'),
('bb6737ef-bda5-4156-848c-ba96ccaf9bc6', '9018ca85-544c-47e7-a901-567d861037a7', 'Cattle famer', '1254896314', false, 'cooperative', 'Wakiso', 10000000.00, 10000000, '{income,paye,vat}', false, false, false, false, NULL, NULL, NULL, NULL, '2026-01-20 06:12:35.575749+00', '2026-01-23 00:32:39.023889+00'),
('0ca68140-3fcb-4145-9103-fe3a32c458ce', '2430c4f6-4d30-470a-8351-639828a0f297', 'Fleurieu Milk Company', '1200000', false, 'partnership', 'Adelaide, South Australia', 3.00, 0, '{income,paye,presumptive,vat}', false, false, false, false, NULL, NULL, NULL, NULL, '2026-01-26 03:14:45.474515+00', '2026-01-26 03:14:45.474515+00'),
('d3cd2071-882d-47e3-88fa-31bc3dabb1cc', '9e0dc520-639b-40b9-857e-8e7731a64e7b', 'BlueCheeseCo', NULL, false, 'partnership', '2 Street Suburb', 0.00, 6000000, '{paye,vat,income}', false, false, false, true, 'Joe Blue', 'joe.blue@hotmail.com', '+256 000000000', 'CM000000000000', '2026-01-29 13:52:54.755947+00', '2026-01-29 13:52:54.755947+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tin = EXCLUDED.tin,
  business_type = EXCLUDED.business_type,
  address = EXCLUDED.address,
  turnover = EXCLUDED.turnover,
  annual_turnover = EXCLUDED.annual_turnover,
  tax_types = EXCLUDED.tax_types;

-- Business accountants data
INSERT INTO public.business_accountants (id, business_id, accountant_id, can_view, can_edit, can_upload, can_generate_reports, assigned_by, assigned_at) VALUES
('8e14e10f-33d6-411b-8cea-1f9513c821c0', '2ba2ea7a-dfb8-467c-a888-788a6080d958', '5419352e-e6a2-4c3d-9e21-95f84701f919', true, true, true, true, '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-23 04:18:13.159471+00')
ON CONFLICT (id) DO NOTHING;

-- Expenses data
INSERT INTO public.expenses (id, business_id, amount, category, description, expense_date, payment_method, tax_period, is_locked, created_by, created_at, updated_at) VALUES
('1e20c39c-4b8f-4616-9614-364093584845', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 500000, 'rent', 'Paid rent', '2026-01-23', 'cash', '2026-01', false, '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-23 08:39:42.791848+00', '2026-01-23 08:39:42.791848+00'),
('3316e2e1-0945-4a94-bb1b-f757e1170c85', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 50000, 'utilities', 'WATER', '2026-01-23', 'mobile_money', '2026-01', false, '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-23 08:57:23.018611+00', '2026-01-23 08:57:23.018611+00'),
('83b31713-6260-4d50-b922-85520ccf26ea', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 2000000, 'supplies', 'stock', '2026-01-23', 'bank', '2026-01', false, '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-23 09:14:51.819378+00', '2026-01-23 09:14:51.819378+00')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Income data
INSERT INTO public.income (id, business_id, amount, source, source_name, description, income_date, payment_method, tax_period, is_locked, created_by, created_at, updated_at) VALUES
('e178df25-97b4-42a1-9411-b09ab2e9daac', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 200000, 'grants', 'Supplies', '215', '2026-01-26', 'cash', '2026-01', false, '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-26 04:34:15.264522+00', '2026-01-26 04:35:01.006378+00')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  source = EXCLUDED.source,
  description = EXCLUDED.description;

-- Tax forms data
INSERT INTO public.tax_forms (id, business_id, tax_type, tax_period, form_data, calculated_tax, status, created_by, created_at, updated_at) VALUES
('cb3a5e9f-b8da-48ec-b7bf-5daf884aa689', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 'vat', '2026-December', '{"exempt_supplies": 50000, "input_vat": 0, "output_vat": 8991000, "period_month": "December", "period_year": "2026", "total_sales": 50000000, "zero_rated_supplies": 0}'::jsonb, 8991000, 'submitted', '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-21 14:07:44.754796+00', '2026-01-21 14:07:48.183129+00'),
('82016796-aa8e-4303-8d01-3941f39162a3', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 'vat', '2026-December', '{"exempt_supplies": 22999, "input_vat": 500000, "output_vat": 10000, "period_month": "December", "period_year": "2026", "total_sales": 20000, "zero_rated_supplies": 0}'::jsonb, 0, 'submitted', '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-23 08:43:24.325697+00', '2026-01-23 08:43:48.99217+00'),
('a76465c8-959b-408f-bef7-d05135f17d3d', '2ba2ea7a-dfb8-467c-a888-788a6080d958', 'paye', '2026-January', '{"allowances": 20000, "employee_name": "Test i", "employee_tin": "2323565475", "gross_salary": 10000000, "nssf_contribution": 40000, "other_deductions": 2500, "period_month": "January", "period_year": "2026"}'::jsonb, 2895250, 'submitted', '32d5fadc-25a5-4bd7-8179-18ce3b7608ad', '2026-01-26 11:54:31.426291+00', '2026-01-26 11:54:49.202918+00')
ON CONFLICT (id) DO UPDATE SET
  form_data = EXCLUDED.form_data,
  calculated_tax = EXCLUDED.calculated_tax,
  status = EXCLUDED.status;


-- ============================================================
-- END OF BACKUP
-- ============================================================
