-- Strikte RLS für Mitarbeiter: Nur eigene Daten sichtbar

-- 1. TERMINE: Nur Admins sehen alle, Mitarbeiter nur eigene
DROP POLICY IF EXISTS "Authenticated users can delete termine" ON public.termine;
DROP POLICY IF EXISTS "Authenticated users can insert termine" ON public.termine;
DROP POLICY IF EXISTS "Authenticated users can update termine" ON public.termine;

-- Admins können alles mit Terminen machen
DROP POLICY IF EXISTS "Admins can manage all termine" ON public.termine;
CREATE POLICY "Admins can manage all termine"
ON public.termine
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. KUNDEN: Nur Admins sehen alle Kunden, Mitarbeiter sehen nur zugewiesene
DROP POLICY IF EXISTS "Authenticated users can delete kunden" ON public.kunden;
DROP POLICY IF EXISTS "Authenticated users can insert kunden" ON public.kunden;
DROP POLICY IF EXISTS "Authenticated users can read kunden" ON public.kunden;
DROP POLICY IF EXISTS "Authenticated users can update kunden" ON public.kunden;

-- Admins können alle Kunden verwalten
DROP POLICY IF EXISTS "Admins can manage all kunden" ON public.kunden;
CREATE POLICY "Admins can manage all kunden"
ON public.kunden
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Mitarbeiter können nur Kunden lesen, die ihnen zugewiesen sind
DROP POLICY IF EXISTS "Mitarbeiter can read assigned kunden" ON public.kunden;
CREATE POLICY "Mitarbeiter can read assigned kunden"
ON public.kunden
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mitarbeiter m
    JOIN public.termine t ON t.mitarbeiter_id = m.id
    WHERE m.benutzer_id = auth.uid()
    AND t.kunden_id = kunden.id
  )
);

-- 3. MITARBEITER: Nur Admins sehen alle, entferne öffentlichen Lesezugriff
DROP POLICY IF EXISTS "Authenticated users can read mitarbeiter" ON public.mitarbeiter;

-- 4. ANDERE TABELLEN: Nur Admins haben vollen Zugriff

-- Kunden Zeitfenster
DROP POLICY IF EXISTS "Authenticated users can delete kunden_zeitfenster" ON public.kunden_zeitfenster;
DROP POLICY IF EXISTS "Authenticated users can insert kunden_zeitfenster" ON public.kunden_zeitfenster;
DROP POLICY IF EXISTS "Authenticated users can read kunden_zeitfenster" ON public.kunden_zeitfenster;
DROP POLICY IF EXISTS "Authenticated users can update kunden_zeitfenster" ON public.kunden_zeitfenster;

DROP POLICY IF EXISTS "Admins can manage kunden_zeitfenster" ON public.kunden_zeitfenster;
CREATE POLICY "Admins can manage kunden_zeitfenster"
ON public.kunden_zeitfenster
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Mitarbeiter Verfügbarkeit
DROP POLICY IF EXISTS "Authenticated users can delete mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit;
DROP POLICY IF EXISTS "Authenticated users can insert mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit;
DROP POLICY IF EXISTS "Authenticated users can read mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit;
DROP POLICY IF EXISTS "Authenticated users can update mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit;

DROP POLICY IF EXISTS "Admins can manage mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit;
CREATE POLICY "Admins can manage mitarbeiter_verfuegbarkeit"
ON public.mitarbeiter_verfuegbarkeit
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Mitarbeiter Abwesenheiten
DROP POLICY IF EXISTS "Authenticated users can delete mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten;
DROP POLICY IF EXISTS "Authenticated users can insert mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten;
DROP POLICY IF EXISTS "Authenticated users can read mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten;
DROP POLICY IF EXISTS "Authenticated users can update mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten;

DROP POLICY IF EXISTS "Admins can manage mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten;
CREATE POLICY "Admins can manage mitarbeiter_abwesenheiten"
ON public.mitarbeiter_abwesenheiten
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Termin Vorlagen
DROP POLICY IF EXISTS "Authenticated users can delete termin_vorlagen" ON public.termin_vorlagen;
DROP POLICY IF EXISTS "Authenticated users can insert termin_vorlagen" ON public.termin_vorlagen;
DROP POLICY IF EXISTS "Authenticated users can read termin_vorlagen" ON public.termin_vorlagen;
DROP POLICY IF EXISTS "Authenticated users can update termin_vorlagen" ON public.termin_vorlagen;

DROP POLICY IF EXISTS "Admins can manage termin_vorlagen" ON public.termin_vorlagen;
CREATE POLICY "Admins can manage termin_vorlagen"
ON public.termin_vorlagen
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Termin Änderungen - Mitarbeiter können ihre eigenen sehen
DROP POLICY IF EXISTS "Authenticated users can delete termin_aenderungen" ON public.termin_aenderungen;
DROP POLICY IF EXISTS "Authenticated users can read termin_aenderungen" ON public.termin_aenderungen;
DROP POLICY IF EXISTS "Authenticated users can update termin_aenderungen" ON public.termin_aenderungen;
DROP POLICY IF EXISTS "Public can read termin_aenderungen" ON public.termin_aenderungen;

DROP POLICY IF EXISTS "Admins can manage termin_aenderungen" ON public.termin_aenderungen;
CREATE POLICY "Admins can manage termin_aenderungen"
ON public.termin_aenderungen
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Mitarbeiter can read own change requests" ON public.termin_aenderungen;
CREATE POLICY "Mitarbeiter can read own change requests"
ON public.termin_aenderungen
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mitarbeiter m
    WHERE m.benutzer_id = auth.uid()
    AND m.id = termin_aenderungen.requested_by
  )
);