-- RPC zum Freischalten von Mitarbeitern (nur für Admins)
CREATE OR REPLACE FUNCTION public.freischalte_mitarbeiter(
  p_user_id uuid,
  p_email citext
)
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  -- Prüfung: der aufrufende User muss Admin sein
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Insert in benutzer Tabelle
  INSERT INTO public.benutzer (id, email, rolle)
  VALUES (p_user_id, p_email, 'mitarbeiter')
  ON CONFLICT (id) DO NOTHING;
  
  -- Automatisch wird via Trigger ein Eintrag in mitarbeiter erstellt
END;
$$;

-- RPC zum Abrufen nicht freigeschalteter User (nur für Admins)
CREATE OR REPLACE FUNCTION public.get_unactivated_users()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prüfung: der aufrufende User muss Admin sein
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Gebe alle auth.users zurück, die NICHT in benutzer sind
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    au.created_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.benutzer b WHERE b.id = au.id
  )
  ORDER BY au.created_at DESC;
END;
$$;