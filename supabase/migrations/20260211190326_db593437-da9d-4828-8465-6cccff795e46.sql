
-- 1. Add new employee profile fields to mitarbeiter table
ALTER TABLE public.mitarbeiter 
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NULL,
  ADD COLUMN IF NOT EXISTS qualification text NULL,
  ADD COLUMN IF NOT EXISTS employment_type text NULL;

-- 2. Create function to enforce at least one active GF exists
CREATE OR REPLACE FUNCTION public.enforce_last_gf_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  active_gf_count integer;
BEGIN
  -- On DELETE of a geschaeftsfuehrer role
  IF TG_OP = 'DELETE' AND OLD.role = 'geschaeftsfuehrer' THEN
    SELECT COUNT(*) INTO active_gf_count
    FROM public.user_roles ur
    JOIN public.benutzer b ON b.id = ur.user_id
    WHERE ur.role = 'geschaeftsfuehrer'
      AND b.status = 'approved'
      AND ur.id != OLD.id;

    IF active_gf_count < 1 THEN
      RAISE EXCEPTION 'Die letzte Geschäftsführer-Rolle kann nicht entfernt werden. Es muss immer mindestens ein aktiver Geschäftsführer existieren.';
    END IF;
  END IF;

  -- On UPDATE that changes role away from geschaeftsfuehrer
  IF TG_OP = 'UPDATE' AND OLD.role = 'geschaeftsfuehrer' AND NEW.role != 'geschaeftsfuehrer' THEN
    SELECT COUNT(*) INTO active_gf_count
    FROM public.user_roles ur
    JOIN public.benutzer b ON b.id = ur.user_id
    WHERE ur.role = 'geschaeftsfuehrer'
      AND b.status = 'approved'
      AND ur.id != OLD.id;

    IF active_gf_count < 1 THEN
      RAISE EXCEPTION 'Die letzte Geschäftsführer-Rolle kann nicht geändert werden. Es muss immer mindestens ein aktiver Geschäftsführer existieren.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create trigger on user_roles for last-GF protection
DROP TRIGGER IF EXISTS enforce_last_gf ON public.user_roles;
CREATE TRIGGER enforce_last_gf
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_last_gf_protection();

-- 4. Create function to prevent deactivating the last GF via benutzer table
CREATE OR REPLACE FUNCTION public.enforce_last_gf_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  active_gf_count integer;
  is_gf boolean;
BEGIN
  -- Only check when status changes away from approved or when being deactivated
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Check if this user has a GF role
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles WHERE user_id = OLD.id AND role = 'geschaeftsfuehrer'
    ) INTO is_gf;

    IF is_gf THEN
      SELECT COUNT(*) INTO active_gf_count
      FROM public.user_roles ur
      JOIN public.benutzer b ON b.id = ur.user_id
      WHERE ur.role = 'geschaeftsfuehrer'
        AND b.status = 'approved'
        AND b.id != OLD.id;

      IF active_gf_count < 1 THEN
        RAISE EXCEPTION 'Der letzte aktive Geschäftsführer kann nicht deaktiviert werden.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_last_gf_benutzer ON public.benutzer;
CREATE TRIGGER enforce_last_gf_benutzer
  BEFORE UPDATE ON public.benutzer
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_last_gf_deactivation();

-- 5. Also protect mitarbeiter deactivation for last GF
CREATE OR REPLACE FUNCTION public.enforce_last_gf_mitarbeiter_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  active_gf_count integer;
  is_gf boolean;
BEGIN
  -- Only check when ist_aktiv changes from true to false
  IF OLD.ist_aktiv = true AND NEW.ist_aktiv = false AND OLD.benutzer_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles WHERE user_id = OLD.benutzer_id AND role = 'geschaeftsfuehrer'
    ) INTO is_gf;

    IF is_gf THEN
      SELECT COUNT(*) INTO active_gf_count
      FROM public.user_roles ur
      JOIN public.benutzer b ON b.id = ur.user_id
      JOIN public.mitarbeiter m ON m.benutzer_id = b.id
      WHERE ur.role = 'geschaeftsfuehrer'
        AND b.status = 'approved'
        AND m.ist_aktiv = true
        AND m.id != OLD.id;

      IF active_gf_count < 1 THEN
        RAISE EXCEPTION 'Der letzte aktive Geschäftsführer kann nicht deaktiviert werden.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_last_gf_mitarbeiter ON public.mitarbeiter;
CREATE TRIGGER enforce_last_gf_mitarbeiter
  BEFORE UPDATE ON public.mitarbeiter
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_last_gf_mitarbeiter_deactivation();
