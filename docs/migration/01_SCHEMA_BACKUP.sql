-- ============================================
-- VOLLSTÄNDIGES SCHEMA-BACKUP für Lovable Cloud Migration
-- Projekt: EasyAssist Hub
-- Datum: 2026-01-23
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================
-- 2. ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE benutzer_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recurrence_interval AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE standort AS ENUM ('Hannover', 'Hildesheim', 'Peine');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE termin_status AS ENUM ('unassigned', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_rolle AS ENUM ('admin', 'mitarbeiter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. TABELLEN
-- ============================================

-- Benutzer
CREATE TABLE IF NOT EXISTS public.benutzer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  rolle user_rolle NOT NULL,
  status benutzer_status NOT NULL DEFAULT 'pending',
  vorname TEXT,
  nachname TEXT,
  geburtsdatum DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mitarbeiter
CREATE TABLE IF NOT EXISTS public.mitarbeiter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benutzer_id UUID UNIQUE REFERENCES public.benutzer(id) ON DELETE SET NULL,
  vorname TEXT,
  nachname TEXT,
  telefon TEXT,
  strasse TEXT,
  plz TEXT,
  stadt TEXT,
  adresse TEXT,
  standort standort DEFAULT 'Hannover',
  zustaendigkeitsbereich TEXT,
  farbe_kalender TEXT DEFAULT '#3B82F6',
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  soll_wochenstunden NUMERIC,
  max_termine_pro_tag INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kunden
CREATE TABLE IF NOT EXISTS public.kunden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  vorname TEXT,
  nachname TEXT,
  email TEXT,
  telefonnr TEXT,
  strasse TEXT,
  plz TEXT,
  stadt TEXT,
  stadtteil TEXT,
  adresse TEXT,
  geburtsdatum DATE,
  pflegegrad SMALLINT,
  pflegekasse TEXT,
  versichertennummer TEXT,
  kasse_privat TEXT,
  kategorie TEXT DEFAULT 'Kunde',
  status TEXT,
  aktiv BOOLEAN NOT NULL DEFAULT true,
  startdatum DATE,
  eintritt DATE,
  austritt DATE,
  sollstunden SMALLINT,
  stunden_kontingent_monat NUMERIC DEFAULT 0,
  mitarbeiter UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  notfall_name TEXT,
  notfall_telefon TEXT,
  angehoerige_ansprechpartner TEXT,
  begruendung TEXT,
  verhinderungspflege_status TEXT,
  kopie_lw TEXT,
  tage TEXT,
  sonstiges TEXT,
  column1 TEXT,
  farbe_kalender TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kunden Zeitfenster
CREATE TABLE IF NOT EXISTS public.kunden_zeitfenster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  wochentag SMALLINT,
  von TIME,
  bis TIME,
  prioritaet SMALLINT DEFAULT 3
);

-- Mitarbeiter Verfügbarkeit
CREATE TABLE IF NOT EXISTS public.mitarbeiter_verfuegbarkeit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  wochentag SMALLINT NOT NULL,
  von TIME NOT NULL,
  bis TIME NOT NULL
);

-- Mitarbeiter Abwesenheiten
CREATE TABLE IF NOT EXISTS public.mitarbeiter_abwesenheiten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  zeitraum TSTZRANGE NOT NULL,
  grund TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Termin Vorlagen
CREATE TABLE IF NOT EXISTS public.termin_vorlagen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  wochentag SMALLINT NOT NULL,
  start_zeit TIME NOT NULL,
  dauer_minuten INTEGER NOT NULL DEFAULT 60,
  intervall recurrence_interval NOT NULL DEFAULT 'weekly',
  gueltig_von DATE NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis DATE,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Termine
CREATE TABLE IF NOT EXISTS public.termine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status termin_status NOT NULL DEFAULT 'unassigned',
  vorlage_id UUID REFERENCES public.termin_vorlagen(id) ON DELETE SET NULL,
  ist_ausnahme BOOLEAN DEFAULT false,
  ausnahme_grund TEXT,
  iststunden NUMERIC DEFAULT 0,
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Termin Änderungen
CREATE TABLE IF NOT EXISTS public.termin_aenderungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termin_id UUID NOT NULL REFERENCES public.termine(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  status approval_status NOT NULL DEFAULT 'pending',
  old_start_at TIMESTAMPTZ,
  old_end_at TIMESTAMPTZ,
  old_kunden_id UUID,
  old_mitarbeiter_id UUID,
  new_start_at TIMESTAMPTZ,
  new_end_at TIMESTAMPTZ,
  new_kunden_id UUID,
  new_mitarbeiter_id UUID,
  reason TEXT,
  approver_id UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dokumente
CREATE TABLE IF NOT EXISTS public.dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  dateiname TEXT NOT NULL,
  dateipfad TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  groesse_bytes BIGINT NOT NULL,
  beschreibung TEXT,
  kategorie TEXT NOT NULL DEFAULT 'kunde',
  kunden_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  hochgeladen_von UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pending Registrations
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  vorname TEXT,
  nachname TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ignored BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  row_id UUID,
  old_data JSONB,
  new_data JSONB,
  actor_benutzer_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. INDIZES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_termine_mitarbeiter ON public.termine(mitarbeiter_id);
CREATE INDEX IF NOT EXISTS idx_termine_kunden ON public.termine(kunden_id);
CREATE INDEX IF NOT EXISTS idx_termine_start_at ON public.termine(start_at);
CREATE INDEX IF NOT EXISTS idx_kunden_aktiv ON public.kunden(aktiv);
CREATE INDEX IF NOT EXISTS idx_mitarbeiter_aktiv ON public.mitarbeiter(ist_aktiv);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.benutzer
    WHERE id = user_id AND rolle = 'admin'
  );
$$;

-- get_user_rolle function
CREATE OR REPLACE FUNCTION public.get_user_rolle(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rolle::text FROM public.benutzer WHERE id = p_user_id
$$;

-- sync_mitarbeiter_name trigger function
CREATE OR REPLACE FUNCTION public.sync_mitarbeiter_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.mitarbeiter
  SET 
    vorname = NEW.vorname,
    nachname = NEW.nachname
  WHERE benutzer_id = NEW.id;
  RETURN NEW;
END;
$$;

-- check_planungsregeln trigger function
CREATE OR REPLACE FUNCTION public.check_planungsregeln()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aktiv boolean;
  v_limit int;
  v_cnt int;
  v_has_verf boolean;
  v_verf_ok int;
  v_absent int;
  v_dow int;
BEGIN
  IF NEW.status NOT IN ('scheduled','in_progress','completed') THEN
    RETURN NEW;
  END IF;

  SELECT ist_aktiv, max_termine_pro_tag INTO v_aktiv, v_limit
  FROM mitarbeiter WHERE id = NEW.mitarbeiter_id;
  IF v_aktiv IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Mitarbeiter % ist inaktiv', NEW.mitarbeiter_id;
  END IF;

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

  SELECT EXISTS(SELECT 1 FROM mitarbeiter_verfuegbarkeit v WHERE v.mitarbeiter_id=NEW.mitarbeiter_id)
  INTO v_has_verf;

  IF v_has_verf THEN
    v_dow := EXTRACT(DOW FROM NEW.start_at)::int;
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

  SELECT COUNT(*) INTO v_absent
  FROM mitarbeiter_abwesenheiten a
  WHERE a.mitarbeiter_id = NEW.mitarbeiter_id
    AND a.zeitraum && tstzrange(NEW.start_at, NEW.end_at, '[)');
  IF v_absent > 0 THEN
    RAISE EXCEPTION 'Mitarbeiter im Zeitraum abwesend';
  END IF;

  RETURN NEW;
END;
$$;

-- approve_termin_change function
CREATE OR REPLACE FUNCTION public.approve_termin_change(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  change_rec RECORD;
  current_user_id UUID;
BEGIN
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User context not set';
  END IF;
  
  SELECT * INTO change_rec FROM public.termin_aenderungen 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found or already processed';
  END IF;
  
  UPDATE public.termine SET
    kunden_id = COALESCE(change_rec.new_kunden_id, kunden_id),
    mitarbeiter_id = COALESCE(change_rec.new_mitarbeiter_id, mitarbeiter_id),
    start_at = COALESCE(change_rec.new_start_at, start_at),
    end_at = COALESCE(change_rec.new_end_at, end_at)
  WHERE id = change_rec.termin_id;
  
  UPDATE public.termin_aenderungen SET
    status = 'approved',
    approved_at = now(),
    approver_id = current_user_id
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$$;

-- reject_termin_change function
CREATE OR REPLACE FUNCTION public.reject_termin_change(p_request_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User context not set';
  END IF;

  UPDATE public.termin_aenderungen SET
    status = 'rejected',
    approved_at = now(),
    approver_id = current_user_id,
    reason = COALESCE(p_reason, reason)
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found or already processed';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- find_free_mitarbeiter function
CREATE OR REPLACE FUNCTION public.find_free_mitarbeiter(p_start timestamptz, p_end timestamptz, p_kunden_id uuid DEFAULT NULL)
RETURNS TABLE(mitarbeiter_id uuid, vorname text, nachname text, email citext, farbe_kalender text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    m.id,
    m.vorname,
    m.nachname,
    b.email,
    m.farbe_kalender
  FROM public.mitarbeiter m
  LEFT JOIN public.benutzer b ON b.id = m.benutzer_id
  WHERE m.ist_aktiv = true
    AND EXISTS (
      SELECT 1 FROM public.mitarbeiter_verfuegbarkeit mv
      WHERE mv.mitarbeiter_id = m.id
        AND mv.wochentag = EXTRACT(DOW FROM p_start)::SMALLINT
        AND mv.von <= p_start::TIME
        AND mv.bis >= p_end::TIME
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mitarbeiter_abwesenheiten ma
      WHERE ma.mitarbeiter_id = m.id
        AND ma.zeitraum && tstzrange(p_start, p_end, '[)')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.termine t
      WHERE t.mitarbeiter_id = m.id
        AND t.status IN ('scheduled', 'confirmed')
        AND tstzrange(t.start_at, t.end_at, '[)') && tstzrange(p_start, p_end, '[)')
    )
    AND (
      m.max_termine_pro_tag IS NULL 
      OR (
        SELECT COUNT(*) FROM public.termine t
        WHERE t.mitarbeiter_id = m.id
          AND t.status IN ('scheduled', 'confirmed')
          AND DATE(t.start_at) = DATE(p_start)
      ) < m.max_termine_pro_tag
    );
END;
$$;

-- ============================================
-- 6. TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS sync_mitarbeiter_name_trigger ON public.benutzer;
CREATE TRIGGER sync_mitarbeiter_name_trigger
  AFTER UPDATE OF vorname, nachname ON public.benutzer
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mitarbeiter_name();

DROP TRIGGER IF EXISTS check_planungsregeln_trigger ON public.termine;
CREATE TRIGGER check_planungsregeln_trigger
  BEFORE INSERT OR UPDATE ON public.termine
  FOR EACH ROW
  EXECUTE FUNCTION public.check_planungsregeln();

-- ============================================
-- 7. RLS POLICIES
-- ============================================
ALTER TABLE public.benutzer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunden_zeitfenster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter_verfuegbarkeit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter_abwesenheiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termin_vorlagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termin_aenderungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Benutzer policies
CREATE POLICY "Users can read own benutzer" ON public.benutzer FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all benutzer" ON public.benutzer FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update benutzer" ON public.benutzer FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Allow public registration" ON public.benutzer FOR INSERT WITH CHECK (status = 'pending' AND rolle = 'mitarbeiter');
CREATE POLICY "Service role can insert" ON public.benutzer FOR INSERT WITH CHECK (true);

-- Mitarbeiter policies
CREATE POLICY "Admins can manage mitarbeiter" ON public.mitarbeiter FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Mitarbeiter can read own" ON public.mitarbeiter FOR SELECT USING (benutzer_id = auth.uid());
CREATE POLICY "Service role can insert mitarbeiter" ON public.mitarbeiter FOR INSERT WITH CHECK (true);

-- Kunden policies
CREATE POLICY "Admins can manage kunden" ON public.kunden FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Mitarbeiter can read assigned kunden" ON public.kunden FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM mitarbeiter m JOIN termine t ON t.mitarbeiter_id = m.id
    WHERE m.benutzer_id = auth.uid() AND t.kunden_id = kunden.id
  ));

-- Termine policies
CREATE POLICY "Admins can manage termine" ON public.termine FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Employees can read own termine" ON public.termine FOR SELECT 
  USING (EXISTS (SELECT 1 FROM mitarbeiter m WHERE m.benutzer_id = auth.uid() AND m.id = termine.mitarbeiter_id));
CREATE POLICY "Employees can insert own termine" ON public.termine FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM mitarbeiter m WHERE m.benutzer_id = auth.uid() AND m.id = termine.mitarbeiter_id));
CREATE POLICY "Employees can update own termine" ON public.termine FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM mitarbeiter m WHERE m.benutzer_id = auth.uid() AND m.id = termine.mitarbeiter_id));

-- Dokumente policies
CREATE POLICY "Admins full access dokumente" ON public.dokumente FOR ALL USING (get_user_rolle(auth.uid()) = 'admin');
CREATE POLICY "Mitarbeiter can read dokumente" ON public.dokumente FOR SELECT 
  USING (get_user_rolle(auth.uid()) = 'mitarbeiter' AND (
    mitarbeiter_id IN (SELECT id FROM mitarbeiter WHERE benutzer_id = auth.uid()) OR
    kunden_id IN (SELECT DISTINCT t.kunden_id FROM termine t JOIN mitarbeiter m ON m.id = t.mitarbeiter_id WHERE m.benutzer_id = auth.uid()) OR
    kategorie = 'intern'
  ));

-- Other admin-only tables
CREATE POLICY "Admins can manage kunden_zeitfenster" ON public.kunden_zeitfenster FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage termin_vorlagen" ON public.termin_vorlagen FOR ALL USING (is_admin(auth.uid()));

-- Termin Änderungen policies
CREATE POLICY "Admins can manage termin_aenderungen" ON public.termin_aenderungen FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Mitarbeiter can read own requests" ON public.termin_aenderungen FOR SELECT 
  USING (EXISTS (SELECT 1 FROM mitarbeiter m WHERE m.benutzer_id = auth.uid() AND m.id = termin_aenderungen.requested_by));
CREATE POLICY "Mitarbeiter can insert requests" ON public.termin_aenderungen FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM mitarbeiter m JOIN termine t ON t.mitarbeiter_id = m.id WHERE m.benutzer_id = auth.uid() AND t.id = termin_aenderungen.termin_id));

-- Pending registrations policies
CREATE POLICY "Allow public registration requests" ON public.pending_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view registrations" ON public.pending_registrations FOR SELECT USING (is_admin(auth.uid()) AND ignored = false);
CREATE POLICY "Admins can update registrations" ON public.pending_registrations FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete registrations" ON public.pending_registrations FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own registration" ON public.pending_registrations FOR SELECT USING (email = (auth.jwt()->>'email')::citext);

-- Audit log policies
CREATE POLICY "Authenticated can read audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============================================
-- 8. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.benutzer TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mitarbeiter TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kunden TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kunden_zeitfenster TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mitarbeiter_verfuegbarkeit TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mitarbeiter_abwesenheiten TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.termin_vorlagen TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.termine TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.termin_aenderungen TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dokumente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_registrations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rolle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_free_mitarbeiter(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_termin_change(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_termin_change(uuid, text) TO authenticated;

-- Storage bucket für dokumente
INSERT INTO storage.buckets (id, name, public) VALUES ('dokumente', 'dokumente', false) ON CONFLICT DO NOTHING;
