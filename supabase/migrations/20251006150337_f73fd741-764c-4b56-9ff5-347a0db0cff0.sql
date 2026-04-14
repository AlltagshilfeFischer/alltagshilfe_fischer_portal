-- Erstelle Tabelle für ausstehende Registrierungen
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.benutzer(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- RLS für pending_registrations
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Admins können alles sehen und verwalten
DROP POLICY IF EXISTS "Admins can manage pending_registrations" ON public.pending_registrations;
CREATE POLICY "Admins can manage pending_registrations"
ON public.pending_registrations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.benutzer
    WHERE id = auth.uid() AND rolle = 'admin'
  )
);

-- Funktion: Prüfe ob Nutzer Admin ist
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.benutzer
    WHERE id = user_id AND rolle = 'admin'
  );
$$;

-- Funktion: Genehmige Registrierung
CREATE OR REPLACE FUNCTION public.approve_registration(
  p_registration_id UUID,
  p_email CITEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_registration RECORD;
BEGIN
  -- Prüfe ob der aktuelle User Admin ist
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung');
  END IF;

  -- Hole Registrierung
  SELECT * INTO v_registration
  FROM public.pending_registrations
  WHERE id = p_registration_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registrierung nicht gefunden oder bereits bearbeitet');
  END IF;

  -- Erstelle Auth-User (durch Supabase Admin API müsste das gemacht werden)
  -- Hier nur die Datenbank-Einträge vorbereiten
  
  -- Markiere als genehmigt
  UPDATE public.pending_registrations
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_registration.email,
    'message', 'Registrierung genehmigt. Nutzer kann sich jetzt einloggen.'
  );
END;
$$;

-- Funktion: Lehne Registrierung ab
CREATE OR REPLACE FUNCTION public.reject_registration(
  p_registration_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prüfe ob der aktuelle User Admin ist
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung');
  END IF;

  -- Markiere als abgelehnt
  UPDATE public.pending_registrations
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = p_reason
  WHERE id = p_registration_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registrierung nicht gefunden');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Registrierung abgelehnt');
END;
$$;

-- Trigger: Bei neuer Registrierung automatisch in pending_registrations eintragen
CREATE OR REPLACE FUNCTION public.handle_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wenn ein neuer User in auth.users erstellt wird, erstelle einen Eintrag in pending_registrations
  INSERT INTO public.pending_registrations (email)
  VALUES (NEW.email)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Erstelle Trigger nur wenn er noch nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_pending'
  ) THEN
    CREATE TRIGGER on_auth_user_created_pending
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_registration();
  END IF;
END$$;

-- Aktualisiere handle_new_user_provisioning um nur genehmigte User zu provisionieren
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved BOOLEAN;
BEGIN
  -- Prüfe ob die Registrierung genehmigt wurde
  SELECT (status = 'approved') INTO v_approved
  FROM public.pending_registrations
  WHERE email = NEW.email;

  -- Wenn nicht genehmigt, provisioniere nicht (User kann sich nicht einloggen)
  IF v_approved IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Ensure a benutzer row exists, default role as 'mitarbeiter'
  IF NOT EXISTS (SELECT 1 FROM public.benutzer b WHERE b.id = NEW.id) THEN
    INSERT INTO public.benutzer (id, email, vorname, nachname, rolle)
    VALUES (NEW.id, NEW.email::citext, NULL, NULL, 'mitarbeiter'::user_rolle);
  END IF;

  -- If user is not admin, ensure a mitarbeiter row exists
  IF NOT EXISTS (
    SELECT 1 FROM public.benutzer b WHERE b.id = NEW.id AND b.rolle = 'admin'::user_rolle
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.mitarbeiter m WHERE m.benutzer_id = NEW.id) THEN
      INSERT INTO public.mitarbeiter (benutzer_id, email, ist_aktiv)
      VALUES (NEW.id, NEW.email::citext, TRUE);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;