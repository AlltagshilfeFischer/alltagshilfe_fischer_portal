-- termin_vorlagen: kunden_id optional machen (Schulungen, interne Regeltermine)
ALTER TABLE termin_vorlagen ALTER COLUMN kunden_id DROP NOT NULL;
