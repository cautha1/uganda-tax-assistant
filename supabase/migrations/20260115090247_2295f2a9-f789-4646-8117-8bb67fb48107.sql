-- Add onboarding-related columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS owner_nin text,
ADD COLUMN IF NOT EXISTS owner_phone text,
ADD COLUMN IF NOT EXISTS owner_email text,
ADD COLUMN IF NOT EXISTS ura_tin_password text,
ADD COLUMN IF NOT EXISTS tin_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS informal_acknowledged boolean DEFAULT false;

-- Add onboarding_completed column to profiles table to track user onboarding status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create TIN validation function
CREATE OR REPLACE FUNCTION public.validate_tin_format(tin text)
RETURNS boolean AS $$
BEGIN
  RETURN tin ~ '^\d{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create NIN validation function (Uganda format: CM + 12 alphanumeric)
CREATE OR REPLACE FUNCTION public.validate_nin_format(nin text)
RETURNS boolean AS $$
BEGIN
  RETURN nin ~* '^CM[A-Z0-9]{12}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create phone validation function (Uganda format)
CREATE OR REPLACE FUNCTION public.validate_uganda_phone(phone text)
RETURNS boolean AS $$
BEGIN
  RETURN phone ~ '^(\+256|0)[0-9]{9}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create search existing profiles function
CREATE OR REPLACE FUNCTION public.search_existing_profiles(search_term text)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  nin text,
  phone text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name as name,
    p.email,
    p.nin,
    p.phone
  FROM public.profiles p
  WHERE 
    p.nin ILIKE '%' || search_term || '%'
    OR p.email ILIKE '%' || search_term || '%'
    OR p.phone ILIKE '%' || search_term || '%'
    OR p.full_name ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;