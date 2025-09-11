-- Fix the planning rules trigger to allow simple employee assignment
-- Remove the customer time window validation that's blocking our assignments

CREATE OR REPLACE FUNCTION public.check_planungsregeln()
RETURNS TRIGGER AS $$
DECLARE
  v_aktiv boolean;
  v_limit int;
  v_cnt int;
  v_has_verf boolean;
  v_verf_ok int;
  v_absent int;
  v_dow int;
BEGIN
  -- Nur prüfen für aktive Stati
  IF NEW.status NOT IN ('scheduled','in_progress','completed') THEN
    RETURN NEW;
  END IF;

  -- Aktiv?
  SELECT ist_aktiv, max_termine_pro_tag INTO v_aktiv, v_limit
  FROM mitarbeiter WHERE id = NEW.mitarbeiter_id;
  IF v_aktiv IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Mitarbeiter % ist inaktiv', NEW.mitarbeiter_id;
  END IF;

  -- Tageslimit?
  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cnt
    FROM termine
    WHERE mitarbeiter_id = NEW.mitarbeiter_id
      AND status IN ('scheduled','in_progress','completed')
      AND start_at::date = NEW.start_at::date
      AND id IS DISTINCT FROM NEW.id;
    IF v_cnt >= v_limit THEN
      RAISE EXCEPTION 'Tageslimit (% Termine) erreicht für Mitarbeiter %', v_limit, NEW.mitarbeiter_id;
    END IF;
  END IF;

  -- Verfügbarkeit (nur wenn gepflegt)
  SELECT EXISTS(SELECT 1 FROM mitarbeiter_verfuegbarkeit v WHERE v.mitarbeiter_id=NEW.mitarbeiter_id)
  INTO v_has_verf;

  IF v_has_verf THEN
    v_dow := EXTRACT(DOW FROM NEW.start_at)::int; -- 0=So..6=Sa
    SELECT COUNT(*) INTO v_verf_ok
    FROM mitarbeiter_verfuegbarkeit v
    WHERE v.mitarbeiter_id=NEW.mitarbeiter_id
      AND v.wochentag=v_dow
      AND NEW.start_at::time >= v.von
      AND NEW.end_at::time   <= v.bis;
    IF v_verf_ok = 0 THEN
      RAISE EXCEPTION 'Termin außerhalb Verfügbarkeit';
    END IF;
  END IF;

  -- Abwesenheit?
  SELECT COUNT(*) INTO v_absent
  FROM mitarbeiter_abwesenheiten a
  WHERE a.mitarbeiter_id = NEW.mitarbeiter_id
    AND a.zeitraum && tstzrange(NEW.start_at, NEW.end_at, '[)');
  IF v_absent > 0 THEN
    RAISE EXCEPTION 'Mitarbeiter im Zeitraum abwesend';
  END IF;

  -- REMOVED: Kunden-Zeitfenster validation that was blocking simple employee assignments
  -- This allows drag & drop assignment without time validation interference

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;