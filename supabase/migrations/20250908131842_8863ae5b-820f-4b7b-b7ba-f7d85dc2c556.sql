-- Add only the missing foreign key constraints that are causing the error
-- Check and add foreign keys only if they don't exist

-- Check if the foreign key exists before adding it
DO $$
BEGIN
    -- Add foreign key for old_kunden_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termin_aenderungen_old_kunden_id_fkey'
    ) THEN
        ALTER TABLE public.termin_aenderungen 
        ADD CONSTRAINT termin_aenderungen_old_kunden_id_fkey 
        FOREIGN KEY (old_kunden_id) REFERENCES public.kunden(id);
    END IF;

    -- Add foreign key for new_kunden_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termin_aenderungen_new_kunden_id_fkey'
    ) THEN
        ALTER TABLE public.termin_aenderungen 
        ADD CONSTRAINT termin_aenderungen_new_kunden_id_fkey 
        FOREIGN KEY (new_kunden_id) REFERENCES public.kunden(id);
    END IF;

    -- Add foreign key for old_mitarbeiter_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termin_aenderungen_old_mitarbeiter_id_fkey'
    ) THEN
        ALTER TABLE public.termin_aenderungen 
        ADD CONSTRAINT termin_aenderungen_old_mitarbeiter_id_fkey 
        FOREIGN KEY (old_mitarbeiter_id) REFERENCES public.mitarbeiter(id);
    END IF;

    -- Add foreign key for new_mitarbeiter_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termin_aenderungen_new_mitarbeiter_id_fkey'
    ) THEN
        ALTER TABLE public.termin_aenderungen 
        ADD CONSTRAINT termin_aenderungen_new_mitarbeiter_id_fkey 
        FOREIGN KEY (new_mitarbeiter_id) REFERENCES public.mitarbeiter(id);
    END IF;

    -- Add foreign key for requested_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termin_aenderungen_requested_by_fkey'
    ) THEN
        ALTER TABLE public.termin_aenderungen 
        ADD CONSTRAINT termin_aenderungen_requested_by_fkey 
        FOREIGN KEY (requested_by) REFERENCES public.benutzer(id);
    END IF;

    -- Add foreign keys for other tables if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termine_kunden_id_fkey'
    ) THEN
        ALTER TABLE public.termine 
        ADD CONSTRAINT termine_kunden_id_fkey 
        FOREIGN KEY (kunden_id) REFERENCES public.kunden(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'termine_mitarbeiter_id_fkey'
    ) THEN
        ALTER TABLE public.termine 
        ADD CONSTRAINT termine_mitarbeiter_id_fkey 
        FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);
    END IF;
END $$;