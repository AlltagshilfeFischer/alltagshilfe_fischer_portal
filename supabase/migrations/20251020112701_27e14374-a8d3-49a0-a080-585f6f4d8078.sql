-- Sichere RLS-Policies für benutzer Tabelle
-- Entferne die bestehende Policy die es Nutzern erlaubt ihren eigenen benutzer zu updaten
DROP POLICY IF EXISTS "Authenticated users can update their own benutzer" ON public.benutzer;

-- Neue Policy: Nur Admins können Rollen und Status ändern
-- Normale Nutzer können nur ihre Kontaktdaten (vorname, nachname, geburtsdatum) ändern
CREATE POLICY "Users can update own contact data only"
ON public.benutzer
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND rolle = (SELECT rolle FROM public.benutzer WHERE id = auth.uid())  -- Rolle darf nicht geändert werden
  AND status = (SELECT status FROM public.benutzer WHERE id = auth.uid()) -- Status darf nicht geändert werden
);

-- Policy für Admin-Updates bleibt bestehen (bereits vorhanden)
-- "Admins can update benutzer status" erlaubt Admins alles zu ändern

-- Zusätzliche Sicherheit: Verhindere dass neue Benutzer sich als Admin registrieren
DROP POLICY IF EXISTS "Allow public registration in benutzer" ON public.benutzer;

CREATE POLICY "Allow public registration in benutzer"
ON public.benutzer
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'::benutzer_status 
  AND rolle = 'mitarbeiter'::user_rolle  -- Neue Registrierungen sind immer Mitarbeiter
);