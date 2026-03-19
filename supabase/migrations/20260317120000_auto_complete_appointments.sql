-- Auto-Complete: Feld für Audit-Trail
ALTER TABLE termine ADD COLUMN IF NOT EXISTS auto_completed_at TIMESTAMPTZ DEFAULT NULL;
COMMENT ON COLUMN termine.auto_completed_at IS 'Timestamp wann der Termin automatisch als completed markiert wurde';
