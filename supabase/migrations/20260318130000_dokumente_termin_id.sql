ALTER TABLE dokumente ADD COLUMN IF NOT EXISTS termin_id UUID REFERENCES termine(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_dokumente_termin_id ON dokumente(termin_id);
