-- Update handle_new_user function to read role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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