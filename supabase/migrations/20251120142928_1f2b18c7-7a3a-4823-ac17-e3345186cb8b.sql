-- Rename column kopie_lw_vorhanden to kopie_lw in kunden table
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'kunden' AND column_name = 'kopie_lw_vorhanden'
  ) THEN
    ALTER TABLE public.kunden RENAME COLUMN kopie_lw_vorhanden TO kopie_lw;
  END IF;
END $$;