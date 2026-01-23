-- Allow users to view profiles of accountants (for assignment purposes)
CREATE POLICY "Users can view accountant profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = profiles.id
      AND user_roles.role = 'accountant'
    )
  );