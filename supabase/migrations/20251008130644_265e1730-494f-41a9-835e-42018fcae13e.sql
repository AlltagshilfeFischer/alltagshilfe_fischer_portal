-- Allow authenticated users to view their own registration by email claim
DROP POLICY IF EXISTS "Users can view their own registration" ON public.pending_registrations;
CREATE POLICY "Users can view their own registration"
ON public.pending_registrations
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email')::citext);
