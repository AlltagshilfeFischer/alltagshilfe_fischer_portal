
-- =====================================================
-- SCHRITT 2: Daten migrieren, Funktionen & Trigger
-- =====================================================

-- 1. admin@af-verwaltung.de auf globaladmin setzen
UPDATE public.user_roles 
SET role = 'globaladmin' 
WHERE user_id = (SELECT id FROM public.benutzer WHERE email = 'admin@af-verwaltung.de')
  AND role = 'geschaeftsfuehrer';

UPDATE public.benutzer 
SET rolle = 'globaladmin' 
WHERE email = 'admin@af-verwaltung.de';

-- 2. GlobalAdmin nicht buchbar
UPDATE public.mitarbeiter 
SET is_bookable = false
WHERE benutzer_id = (SELECT id FROM public.benutzer WHERE email = 'admin@af-verwaltung.de');

-- =====================================================
-- DB-FUNKTIONEN
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_globaladmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'globaladmin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_geschaeftsfuehrer(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('geschaeftsfuehrer', 'globaladmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'geschaeftsfuehrer', 'globaladmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_secure(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'geschaeftsfuehrer', 'globaladmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_delete(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('geschaeftsfuehrer', 'globaladmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_rolle(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'globaladmin') THEN 'globaladmin'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'geschaeftsfuehrer') THEN 'geschaeftsfuehrer'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'admin') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'buchhaltung') THEN 'buchhaltung'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'mitarbeiter') THEN 'mitarbeiter'
    ELSE NULL
  END
$$;

-- =====================================================
-- SCHUTZ-TRIGGER
-- =====================================================

-- Alte Trigger entfernen
DROP TRIGGER IF EXISTS enforce_last_gf_protection ON public.user_roles;
DROP TRIGGER IF EXISTS enforce_last_gf_deactivation ON public.benutzer;
DROP TRIGGER IF EXISTS enforce_last_gf_mitarbeiter_deactivation ON public.mitarbeiter;
DROP FUNCTION IF EXISTS public.enforce_last_gf_protection() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_last_gf_deactivation() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_last_gf_mitarbeiter_deactivation() CASCADE;

-- Trigger 1: GlobalAdmin-Rolle absolut geschützt
CREATE OR REPLACE FUNCTION public.protect_globaladmin_role()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'globaladmin' THEN
    RAISE EXCEPTION 'Die GlobalAdmin-Rolle kann nicht entfernt werden.';
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.role = 'globaladmin' AND NEW.role != 'globaladmin' THEN
    RAISE EXCEPTION 'Die GlobalAdmin-Rolle kann nicht geändert werden.';
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.role = 'globaladmin' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'globaladmin') THEN
      RAISE EXCEPTION 'Es kann nur einen GlobalAdmin geben.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER protect_globaladmin_role
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_globaladmin_role();

-- Trigger 2: GlobalAdmin-User kann NICHT deaktiviert werden
CREATE OR REPLACE FUNCTION public.protect_globaladmin_user()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = OLD.id AND role = 'globaladmin') THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status != 'approved' THEN
      RAISE EXCEPTION 'Der GlobalAdmin-Account kann nicht deaktiviert werden.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER protect_globaladmin_user
BEFORE UPDATE ON public.benutzer
FOR EACH ROW EXECUTE FUNCTION public.protect_globaladmin_user();
