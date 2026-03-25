-- Migration: Mitarbeiter Personalstammdaten (Anlage 2)
-- Erweitert die mitarbeiter-Tabelle um Felder fuer:
--   Reiter 1: Persoenliche Daten & Vertrag
--   Reiter 2: Steuer & Sozialversicherung
-- Neue Tabelle: mitarbeiter_nebenbeschaeftigung (Reiter 3)

-- ============================================================
-- Reiter 1: Persoenliche Daten & Vertrag
-- ============================================================
ALTER TABLE mitarbeiter
  ADD COLUMN IF NOT EXISTS gehalt_pro_monat NUMERIC,
  ADD COLUMN IF NOT EXISTS vertragsstunden_pro_monat NUMERIC,
  ADD COLUMN IF NOT EXISTS geburtsdatum DATE,
  ADD COLUMN IF NOT EXISTS geburtsname TEXT,
  ADD COLUMN IF NOT EXISTS geburtsort TEXT,
  ADD COLUMN IF NOT EXISTS geburtsland TEXT,
  ADD COLUMN IF NOT EXISTS geschlecht TEXT CHECK (geschlecht IN ('m', 'w', 'd')),
  ADD COLUMN IF NOT EXISTS konfession TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS bank_institut TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT;

-- ============================================================
-- Reiter 2: Steuer & Sozialversicherung
-- ============================================================
ALTER TABLE mitarbeiter
  ADD COLUMN IF NOT EXISTS steuer_id TEXT,
  ADD COLUMN IF NOT EXISTS steuerklasse SMALLINT CHECK (steuerklasse BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS kinderfreibetrag NUMERIC,
  ADD COLUMN IF NOT EXISTS sv_rv_nummer TEXT,
  ADD COLUMN IF NOT EXISTS krankenkasse TEXT;

-- ============================================================
-- Reiter 3: Weitere Beschaeftigungsverhaeltnisse
-- ============================================================
ALTER TABLE mitarbeiter
  ADD COLUMN IF NOT EXISTS weitere_beschaeftigung BOOLEAN DEFAULT false;

-- Separate Tabelle fuer Nebenbeschaeftigungen (1:n)
CREATE TABLE IF NOT EXISTS mitarbeiter_nebenbeschaeftigung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitarbeiter_id UUID NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
  arbeitgeber TEXT NOT NULL,
  art_beschaeftigung TEXT CHECK (art_beschaeftigung IN ('minijob', 'sv_pflichtig', 'kurzfristig', 'ehrenamt')),
  arbeitszeit_stunden_woche NUMERIC,
  gehalt_monatlich NUMERIC,
  sv_pflicht BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nebenbeschaeftigung_mitarbeiter
  ON mitarbeiter_nebenbeschaeftigung(mitarbeiter_id);

-- ============================================================
-- RLS fuer mitarbeiter_nebenbeschaeftigung
-- ============================================================
ALTER TABLE mitarbeiter_nebenbeschaeftigung ENABLE ROW LEVEL SECURITY;

-- Gleiche RLS-Policies wie mitarbeiter: alle authentifizierten Benutzer
CREATE POLICY "Nebenbeschaeftigung: Select fuer authentifizierte"
  ON mitarbeiter_nebenbeschaeftigung FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Nebenbeschaeftigung: Insert fuer authentifizierte"
  ON mitarbeiter_nebenbeschaeftigung FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Nebenbeschaeftigung: Update fuer authentifizierte"
  ON mitarbeiter_nebenbeschaeftigung FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Nebenbeschaeftigung: Delete fuer authentifizierte"
  ON mitarbeiter_nebenbeschaeftigung FOR DELETE
  TO authenticated
  USING (true);

-- updated_at Trigger
CREATE OR REPLACE TRIGGER set_updated_at_nebenbeschaeftigung
  BEFORE UPDATE ON mitarbeiter_nebenbeschaeftigung
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
