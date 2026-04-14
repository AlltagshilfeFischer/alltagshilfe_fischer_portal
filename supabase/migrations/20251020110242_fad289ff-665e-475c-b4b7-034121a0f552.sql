-- Add status column to benutzer table for approval workflow
DO $$ BEGIN
  CREATE TYPE benutzer_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE public.benutzer 
ADD COLUMN IF NOT EXISTS status benutzer_status NOT NULL DEFAULT 'pending';

-- RLS Policy: Admins can update benutzer status
DROP POLICY IF EXISTS "Admins can update benutzer status" ON public.benutzer;
CREATE POLICY "Admins can update benutzer status"
ON public.benutzer
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policy: Allow self-registration (public insert with pending status)
DROP POLICY IF EXISTS "Allow public registration in benutzer" ON public.benutzer;
CREATE POLICY "Allow public registration in benutzer"
ON public.benutzer
FOR INSERT
WITH CHECK (status = 'pending');

-- Comment for documentation
COMMENT ON COLUMN public.benutzer.status IS 'Approval status: pending (waiting), approved (active), rejected (denied)';