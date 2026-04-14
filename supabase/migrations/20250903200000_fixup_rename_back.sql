-- Fixup: Migration 20250903095555 hatte kunden→customers umbenannt.
-- Spätere Migrations referenzieren aber kunden/mitarbeiter/termine.
-- Hier werden die Tabellen zurückbenannt.

-- Rename customers back to kunden
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kunden') THEN
    ALTER TABLE public.customers RENAME TO kunden;
  END IF;
END $$;

-- Rename employees back to mitarbeiter
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='employees')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mitarbeiter') THEN
    ALTER TABLE public.employees RENAME TO mitarbeiter;
  END IF;
END $$;

-- Rename appointments back to termine
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='termine') THEN
    ALTER TABLE public.appointments RENAME TO termine;
  END IF;
END $$;

-- Helper-Funktion die von frühen Lovable-Policies benötigt wird
CREATE OR REPLACE FUNCTION public.is_authenticated_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.role() = 'authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
