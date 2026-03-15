-- Drop the existing vulnerable update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new update policy that prevents users from changing their role
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));