-- Migration: kunden_id nullable + kategorie + absage-Felder für termine
-- Erlaubt interne Termine ohne Kundenzuordnung (Schulungen, Erstgespräche, etc.)
-- Fügt Label/Kategorie-System und Storno-Dokumentation hinzu

ALTER TABLE termine ALTER COLUMN kunden_id DROP NOT NULL;

ALTER TABLE termine ADD COLUMN IF NOT EXISTS kategorie TEXT DEFAULT NULL;
ALTER TABLE termine ADD COLUMN IF NOT EXISTS absage_datum DATE DEFAULT NULL;
ALTER TABLE termine ADD COLUMN IF NOT EXISTS absage_kanal TEXT DEFAULT NULL;

COMMENT ON COLUMN termine.kategorie IS 'Termin-Kategorie: Erstgespräch, Schulung, Intern, Regelbesuch, Sonstiges';
COMMENT ON COLUMN termine.absage_datum IS 'Datum der Absage (wann wurde abgesagt)';
COMMENT ON COLUMN termine.absage_kanal IS 'Absagekanal: Telefonisch, E-Mail, Persönlich, WhatsApp, Sonstiges';
