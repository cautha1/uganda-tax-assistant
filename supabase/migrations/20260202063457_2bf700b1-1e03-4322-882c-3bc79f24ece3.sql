-- Add preferred language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language TEXT DEFAULT 'en' NOT NULL;

-- Add check constraint for valid language values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_preferred_language_check 
CHECK (preferred_language IN ('en', 'lg'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language: en (English) or lg (Luganda)';