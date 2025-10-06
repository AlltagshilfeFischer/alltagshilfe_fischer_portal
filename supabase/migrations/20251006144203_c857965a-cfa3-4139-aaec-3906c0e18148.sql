-- Provisioning trigger and safe backfill without changing benutzer.id

-- 1) Function to provision records on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_provisioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- 2) Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_provisioning ON auth.users;
CREATE TRIGGER on_auth_user_created_provisioning
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_provisioning();

-- 3) Backfill existing auth users (do not alter primary keys)
DO $$
BEGIN
  -- Create benutzer rows for new emails; if email exists, just set role appropriately, keep existing id
  INSERT INTO public.benutzer (id, email, rolle)
  SELECT u.id, u.email::citext,
         CASE WHEN u.email = 'info@kitdienstleistungen.de' THEN 'admin'::user_rolle ELSE 'mitarbeiter'::user_rolle END
  FROM auth.users u
  ON CONFLICT (email) DO UPDATE SET rolle = EXCLUDED.rolle;

  -- Ensure mitarbeiter for non-admins where missing
  INSERT INTO public.mitarbeiter (benutzer_id, email, ist_aktiv)
  SELECT b.id, b.email, TRUE
  FROM public.benutzer b
  LEFT JOIN public.mitarbeiter m ON m.benutzer_id = b.id
  WHERE b.rolle <> 'admin'::user_rolle AND m.benutzer_id IS NULL;
END $$;