-- Allow authenticated users to view their own registration by email claim
CREATE POLICY "Users can view their own registration"
ON public.pending_registrations
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email')::citext);
