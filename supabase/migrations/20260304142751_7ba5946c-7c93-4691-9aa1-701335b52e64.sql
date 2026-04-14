DROP POLICY IF EXISTS "Mitarbeiter can read assigned kunden_zeitfenster" ON public.kunden_zeitfenster;
CREATE POLICY "Mitarbeiter can read assigned kunden_zeitfenster"
ON public.kunden_zeitfenster
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM termine t
    JOIN mitarbeiter m ON m.id = t.mitarbeiter_id
    WHERE t.kunden_id = kunden_zeitfenster.kunden_id
      AND m.benutzer_id = auth.uid()
  )
);