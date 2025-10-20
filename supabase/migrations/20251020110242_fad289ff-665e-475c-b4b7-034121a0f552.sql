-- Add status column to benutzer table for approval workflow
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'benutzer_status') THEN
    CREATE TYPE benutzer_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.benutzer 
ADD COLUMN IF NOT EXISTS status benutzer_status NOT NULL DEFAULT 'pending';

-- RLS Policy: Admins can update benutzer status
CREATE POLICY "Admins can update benutzer status"
ON public.benutzer
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policy: Allow self-registration (public insert with pending status)
CREATE POLICY "Allow public registration in benutzer"
ON public.benutzer
FOR INSERT
WITH CHECK (status = 'pending');

-- Comment for documentation
COMMENT ON COLUMN public.benutzer.status IS 'Approval status: pending (waiting), approved (active), rejected (denied)';