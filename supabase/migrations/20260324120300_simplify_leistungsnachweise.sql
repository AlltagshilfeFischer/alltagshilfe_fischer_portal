-- Leistungsnachweise vereinfachen: entwurf/veröffentlicht entfernen, nur offen/unterschrieben/abgeschlossen
-- Neuer Workflow: offen → unterschrieben → abgeschlossen

-- 1. Bestehende entwurf-Zeilen → offen migrieren
UPDATE public.leistungsnachweise SET status = 'offen' WHERE status = 'entwurf';

-- 2. Falls veröffentlicht-Zeilen existieren (sollte nicht, war nie im CHECK constraint)
UPDATE public.leistungsnachweise SET status = 'offen' WHERE status = 'veröffentlicht';

-- 3. CHECK constraint aktualisieren
ALTER TABLE public.leistungsnachweise DROP CONSTRAINT IF EXISTS leistungsnachweise_status_check;
ALTER TABLE public.leistungsnachweise
  ADD CONSTRAINT leistungsnachweise_status_check
  CHECK (status IN ('offen', 'unterschrieben', 'abgeschlossen'));

-- 4. Default auf 'offen' ändern
ALTER TABLE public.leistungsnachweise ALTER COLUMN status SET DEFAULT 'offen';

-- 5. Frozen-Hours-Spalten für eingefrorene Stunden bei Unterschrift
ALTER TABLE public.leistungsnachweise
  ADD COLUMN IF NOT EXISTS frozen_geplante_stunden numeric,
  ADD COLUMN IF NOT EXISTS frozen_geleistete_stunden numeric;

-- 6. Backfill: Bestehende unterschriebene/abgeschlossene LNs mit aktuellen Stunden einfrieren
UPDATE public.leistungsnachweise
  SET frozen_geplante_stunden = geplante_stunden,
      frozen_geleistete_stunden = geleistete_stunden
  WHERE status IN ('unterschrieben', 'abgeschlossen')
    AND frozen_geplante_stunden IS NULL;
