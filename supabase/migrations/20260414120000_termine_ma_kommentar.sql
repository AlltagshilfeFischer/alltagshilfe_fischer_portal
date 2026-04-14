-- Migration: MA-Kommentar Feld für Terminbestätigung
-- Mitarbeiter können bei nicht-durchgeführten Terminen einen Kommentar hinterlassen.
-- Datei-Anlagen laufen über die bestehende dokumente-Tabelle (termin_id FK vorhanden).

ALTER TABLE public.termine
  ADD COLUMN IF NOT EXISTS ma_kommentar TEXT;

COMMENT ON COLUMN public.termine.ma_kommentar IS
  'Kommentar des Mitarbeiters bei nicht-durchgeführten Terminen (nicht angetroffen, rechtzeitig abgesagt)';