-- Create enum types for roles and business types
CREATE TYPE public.app_role AS ENUM ('sme_owner', 'accountant', 'admin', 'guest');
CREATE TYPE public.business_type AS ENUM ('sole_proprietorship', 'partnership', 'limited_company', 'ngo', 'cooperative', 'other');
CREATE TYPE public.tax_type AS ENUM ('paye', 'income', 'presumptive', 'vat', 'other');
CREATE TYPE public.tax_form_status AS ENUM ('draft', 'validated', 'error', 'submitted');
CREATE TYPE public.feedback_type AS ENUM ('challenge', 'solution', 'general');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  nin TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'guest',
  UNIQUE (user_id, role)
);

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tin TEXT UNIQUE NOT NULL,
  address TEXT,
  business_type business_type DEFAULT 'sole_proprietorship',
  turnover NUMERIC(15,2) DEFAULT 0,
  tax_types tax_type[] DEFAULT '{}',
  is_informal BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on TIN for fast lookups
CREATE INDEX idx_businesses_tin ON public.businesses(tin);

-- Create business_accountants junction table
CREATE TABLE public.business_accountants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  accountant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, accountant_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Function to check if user owns or is accountant for a business
CREATE OR REPLACE FUNCTION public.can_access_business(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
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

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Businesses policies
CREATE POLICY "Owners can view their businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND NOT is_deleted);

CREATE POLICY "Accountants can view assigned businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accountants 
      WHERE business_id = id AND accountant_id = auth.uid()
    ) AND NOT is_deleted
  );

CREATE POLICY "Admins can view all businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "SME owners and admins can create businesses"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'sme_owner') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners and admins can update businesses"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Business accountants policies
CREATE POLICY "Business owners can manage accountants"
  ON public.business_accountants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE id = business_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can view their assignments"
  ON public.business_accountants FOR SELECT
  TO authenticated
  USING (accountant_id = auth.uid());

CREATE POLICY "Admins can manage all accountants"
  ON public.business_accountants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view business audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.can_access_business(auth.uid(), business_id));

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Default role is sme_owner for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sme_owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();