-- Add ignored column to pending_registrations table
ALTER TABLE public.pending_registrations 
ADD COLUMN IF NOT EXISTS ignored BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policy to exclude ignored registrations from view
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.pending_registrations;

CREATE POLICY "Admins can view all registrations" 
ON public.pending_registrations 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) AND ignored = false
);