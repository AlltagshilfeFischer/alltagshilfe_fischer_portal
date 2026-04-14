-- Lovable Base Schema
-- =====================================================
-- Dieses File rekonstruiert das ursprüngliche Lovable-Basisschema,
-- das NICHT in Migrations-Dateien erfasst wurde.
-- Es legt alle Tabellen und ENUMs an, die von späteren Migrations
-- via ALTER TABLE referenziert werden, aber nie per CREATE TABLE erstellt wurden.
--
-- Ausführungsreihenfolge:
--   1. Extensions
--   2. Helper Functions (update_updated_at_column)
--   3. ENUMs (vollständig, mit finalen Werten aus types.ts)
--   4. Lovable Original-Tabellen (customers, employees, appointments, profiles)
--      → werden von den ersten Migrations via ALTER TABLE referenziert
--   5. Basis-Tabellen (haushalte, kostentraeger, benutzer, mitarbeiter, kunden, ...)
--      → werden von späteren Migrations via IF NOT EXISTS idempotent erstellt
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================
-- 2. HELPER FUNCTION: update_updated_at_column
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. ENUMs (finale Werte aus types.ts)
-- =====================================================

-- app_role: wird für user_roles + role_permissions verwendet
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'geschaeftsfuehrer',
    'admin',
    'mitarbeiter',
    'buchhaltung',
    'globaladmin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- approval_status: wird für termin_aenderungen verwendet
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- benutzer_status: wird für benutzer verwendet
DO $$ BEGIN
  CREATE TYPE public.benutzer_status AS ENUM (
    'pending',
    'eingeladen',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- kostentraeger_typ: wird für kostentraeger + abrechnungsregeln verwendet
DO $$ BEGIN
  CREATE TYPE public.kostentraeger_typ AS ENUM (
    'pflegekasse',
    'krankenkasse',
    'kommune',
    'privat',
    'beihilfe'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- leistungs_status: wird für leistungen + leistungs_status_historie verwendet
DO $$ BEGIN
  CREATE TYPE public.leistungs_status AS ENUM (
    'beantragt',
    'genehmigt',
    'aktiv',
    'pausiert',
    'beendet'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- leistungsart: wird für leistungen + abrechnungsregeln verwendet
DO $$ BEGIN
  CREATE TYPE public.leistungsart AS ENUM (
    'entlastungsleistung',
    'verhinderungspflege',
    'kurzzeitpflege',
    'pflegesachleistung',
    'privat',
    'sonstige'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- rechnung_status: wird für rechnungen + abrechnungs_historie verwendet
DO $$ BEGIN
  CREATE TYPE public.rechnung_status AS ENUM (
    'entwurf',
    'freigegeben',
    'versendet',
    'bezahlt',
    'storniert'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- recurrence_interval: wird für termin_vorlagen verwendet
DO $$ BEGIN
  CREATE TYPE public.recurrence_interval AS ENUM (
    'none',
    'weekly',
    'biweekly',
    'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- standort: wird für mitarbeiter verwendet
DO $$ BEGIN
  CREATE TYPE public.standort AS ENUM (
    'Hannover'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- termin_status: wird für termine verwendet (finale Werte inkl. aller späteren Erweiterungen)
DO $$ BEGIN
  CREATE TYPE public.termin_status AS ENUM (
    'unassigned',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'abgerechnet',
    'bezahlt',
    'nicht_angetroffen',
    'abgesagt_rechtzeitig'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_rolle: wird für benutzer verwendet
DO $$ BEGIN
  CREATE TYPE public.user_rolle AS ENUM (
    'geschaeftsfuehrer',
    'admin',
    'mitarbeiter',
    'buchhaltung',
    'globaladmin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. LOVABLE ORIGINAL-TABELLEN
--    (wurden nie in Migrations per CREATE TABLE erfasst,
--     aber von den ersten Migrations via ALTER TABLE referenziert)
-- =====================================================

-- profiles: Lovable Auth-Profil-Tabelle (referenziert in frühen Migrations)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_authenticated_all" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- customers: Lovable Original-Kundentabelle
-- (erste Migrations renamen Spalten, 20250903 renamed die Tabelle zu kunden/mitarbeiter)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  birth_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_authenticated_all" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- employees: Lovable Original-Mitarbeiter-Tabelle
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number TEXT,
  position TEXT,
  hire_date DATE,
  hourly_rate FLOAT8,
  qualifications TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_authenticated_all" ON public.employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- appointments: Lovable Original-Termin-Tabelle
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_authenticated_all" ON public.appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. BASIS-TABELLEN (vollständig, idempotent)
--    Die späteren Migrations verwenden IF NOT EXISTS,
--    daher können diese hier ebenfalls mit IF NOT EXISTS stehen.
--    Sie werden hier für Vollständigkeit und korrekte
--    Abhängigkeitsreihenfolge definiert.
-- =====================================================

-- --------------------------------------------------
-- 5.1 haushalte (keine Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.haushalte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  angehoerige_ansprechpartner TEXT,
  notfall_name TEXT,
  notfall_telefon TEXT,
  rechnungsempfaenger_name TEXT,
  rechnungsempfaenger_strasse TEXT,
  rechnungsempfaenger_plz TEXT,
  rechnungsempfaenger_stadt TEXT,
  sonstiges TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.haushalte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haushalte_authenticated_all" ON public.haushalte
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_haushalte_updated_at
  BEFORE UPDATE ON public.haushalte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.2 kostentraeger (keine Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kostentraeger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  typ public.kostentraeger_typ NOT NULL,
  ik_nummer TEXT,
  anschrift_strasse TEXT,
  anschrift_plz TEXT,
  anschrift_stadt TEXT,
  ansprechpartner TEXT,
  telefon TEXT,
  email TEXT,
  abrechnungs_hinweise TEXT,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.kostentraeger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kostentraeger_authenticated_all" ON public.kostentraeger
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_kostentraeger_updated_at
  BEFORE UPDATE ON public.kostentraeger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.3 benutzer (keine Abhängigkeiten, außer auth.users implizit)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benutzer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  rolle public.user_rolle NOT NULL,
  status public.benutzer_status NOT NULL DEFAULT 'pending',
  vorname TEXT,
  nachname TEXT,
  geburtsdatum DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.benutzer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benutzer_authenticated_all" ON public.benutzer
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_benutzer_updated_at
  BEFORE UPDATE ON public.benutzer
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.4 permissions (keine Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  beschreibung TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_authenticated_all" ON public.permissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.5 qualifikationen (keine Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qualifikationen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kategorie TEXT DEFAULT 'Allgemein',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.qualifikationen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qualifikationen_authenticated_all" ON public.qualifikationen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.6 mitarbeiter (abhängig von: benutzer)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitarbeiter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  benutzer_id UUID UNIQUE REFERENCES public.benutzer(id) ON DELETE SET NULL,
  vorname TEXT,
  nachname TEXT,
  email TEXT,
  telefon TEXT,
  strasse TEXT,
  plz TEXT,
  stadt TEXT,
  adresse TEXT,
  geburtsdatum DATE,
  geburtsort TEXT,
  geburtsland TEXT,
  geburtsname TEXT,
  geschlecht TEXT,
  standort public.standort DEFAULT 'Hannover',
  zustaendigkeitsbereich TEXT,
  farbe_kalender TEXT DEFAULT '#3B82F6',
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  is_bookable BOOLEAN NOT NULL DEFAULT true,
  soll_wochenstunden FLOAT8,
  max_termine_pro_tag INTEGER,
  vertragsstunden_pro_monat FLOAT8,
  gehalt_pro_monat FLOAT8,
  hourly_rate FLOAT8,
  employment_type TEXT,
  steuerklasse INTEGER,
  steuer_id TEXT,
  sv_rv_nummer TEXT,
  konfession TEXT,
  kinderfreibetrag FLOAT8,
  krankenkasse TEXT,
  iban TEXT,
  bank_institut TEXT,
  qualification TEXT,
  avatar_url TEXT,
  email_benachrichtigungen BOOLEAN DEFAULT true,
  weitere_beschaeftigung BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mitarbeiter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mitarbeiter_authenticated_all" ON public.mitarbeiter
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_mitarbeiter_updated_at
  BEFORE UPDATE ON public.mitarbeiter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.7 kunden (abhängig von: haushalte, mitarbeiter)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kunden (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_nummer SERIAL UNIQUE,
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
  geschlecht TEXT,
  pflegegrad INTEGER,
  pflegekasse TEXT,
  versichertennummer TEXT,
  kasse_privat TEXT,
  kategorie TEXT DEFAULT 'Kunde',
  status TEXT,
  aktiv BOOLEAN NOT NULL DEFAULT true,
  archiviert BOOLEAN DEFAULT false,
  startdatum DATE,
  eintritt DATE,
  austritt DATE,
  sollstunden FLOAT8,
  stunden_kontingent_monat FLOAT8 DEFAULT 0,
  mitarbeiter UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  haushalt_id UUID REFERENCES public.haushalte(id) ON DELETE SET NULL,
  notfall_name TEXT,
  notfall_telefon TEXT,
  angehoerige_ansprechpartner TEXT,
  begruendung TEXT,
  verhinderungspflege_status TEXT,
  verhinderungspflege_aktiv BOOLEAN DEFAULT false,
  verhinderungspflege_beantragt BOOLEAN DEFAULT false,
  verhinderungspflege_genehmigt BOOLEAN DEFAULT false,
  verhinderungspflege_genehmigt_am DATE,
  verhinderungspflege_budget FLOAT8,
  initial_budget_verhinderung FLOAT8,
  initial_budget_entlastung FLOAT8,
  entlastung_genehmigt BOOLEAN DEFAULT false,
  kombileistung_genehmigt_am DATE,
  pflegesachleistung_aktiv BOOLEAN DEFAULT false,
  pflegesachleistung_beantragt BOOLEAN DEFAULT false,
  pflegesachleistung_genehmigt BOOLEAN DEFAULT false,
  privatrechnung_erlaubt BOOLEAN DEFAULT false,
  budget_prioritaet TEXT[],
  rechnungskopie TEXT[],
  rechnungskopie_adresse_name TEXT,
  rechnungskopie_adresse_strasse TEXT,
  rechnungskopie_adresse_plz TEXT,
  rechnungskopie_adresse_stadt TEXT,
  kontaktweg TEXT,
  kopie_lw TEXT,
  tage TEXT,
  sonstiges TEXT,
  column1 TEXT,
  farbe_kalender TEXT DEFAULT '#10B981',
  termindauer_stunden FLOAT8,
  terminfrequenz TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunden_authenticated_all" ON public.kunden
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_kunden_updated_at
  BEFORE UPDATE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.8 einsatzorte (abhängig von: haushalte)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.einsatzorte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  haushalt_id UUID NOT NULL REFERENCES public.haushalte(id) ON DELETE CASCADE,
  bezeichnung TEXT,
  strasse TEXT,
  plz TEXT,
  stadt TEXT,
  stadtteil TEXT,
  zugangsinformationen TEXT,
  ist_haupteinsatzort BOOLEAN NOT NULL DEFAULT false,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.einsatzorte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "einsatzorte_authenticated_all" ON public.einsatzorte
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_einsatzorte_updated_at
  BEFORE UPDATE ON public.einsatzorte
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.9 kunden_zeitfenster (abhängig von: kunden)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kunden_zeitfenster (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  wochentag INTEGER,
  von TIME,
  bis TIME,
  prioritaet INTEGER DEFAULT 3
);

ALTER TABLE public.kunden_zeitfenster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunden_zeitfenster_authenticated_all" ON public.kunden_zeitfenster
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.10 mitarbeiter_verfuegbarkeit (abhängig von: mitarbeiter)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitarbeiter_verfuegbarkeit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  wochentag INTEGER NOT NULL,
  von TIME NOT NULL,
  bis TIME NOT NULL
);

ALTER TABLE public.mitarbeiter_verfuegbarkeit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mitarbeiter_verfuegbarkeit_authenticated_all" ON public.mitarbeiter_verfuegbarkeit
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.11 mitarbeiter_abwesenheiten (abhängig von: mitarbeiter, benutzer)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitarbeiter_abwesenheiten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  zeitraum TSTZRANGE NOT NULL,
  von TIMESTAMPTZ,
  bis TIMESTAMPTZ,
  typ TEXT DEFAULT 'urlaub',
  grund TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mitarbeiter_abwesenheiten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mitarbeiter_abwesenheiten_authenticated_all" ON public.mitarbeiter_abwesenheiten
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.12 mitarbeiter_qualifikationen (abhängig von: mitarbeiter, qualifikationen)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitarbeiter_qualifikationen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  qualifikation_id UUID NOT NULL REFERENCES public.qualifikationen(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(mitarbeiter_id, qualifikation_id)
);

ALTER TABLE public.mitarbeiter_qualifikationen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mitarbeiter_qualifikationen_authenticated_all" ON public.mitarbeiter_qualifikationen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.13 mitarbeiter_nebenbeschaeftigung (abhängig von: mitarbeiter)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mitarbeiter_nebenbeschaeftigung (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  arbeitgeber TEXT NOT NULL,
  art_beschaeftigung TEXT,
  arbeitszeit_stunden_woche FLOAT8,
  gehalt_monatlich FLOAT8,
  sv_pflicht BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mitarbeiter_nebenbeschaeftigung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mitarbeiter_nebenbeschaeftigung_authenticated_all" ON public.mitarbeiter_nebenbeschaeftigung
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_mitarbeiter_nebenbeschaeftigung_updated_at
  BEFORE UPDATE ON public.mitarbeiter_nebenbeschaeftigung
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.14 termin_vorlagen (abhängig von: kunden, mitarbeiter)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.termin_vorlagen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  kunden_id UUID REFERENCES public.kunden(id) ON DELETE CASCADE,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  wochentag INTEGER NOT NULL,
  start_zeit TIME NOT NULL,
  dauer_minuten INTEGER NOT NULL DEFAULT 60,
  intervall public.recurrence_interval NOT NULL DEFAULT 'weekly',
  gueltig_von DATE NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis DATE,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  notizen TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.termin_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "termin_vorlagen_authenticated_all" ON public.termin_vorlagen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_termin_vorlagen_updated_at
  BEFORE UPDATE ON public.termin_vorlagen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.15 termine (abhängig von: kunden, mitarbeiter, termin_vorlagen, einsatzorte)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.termine (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  kunden_id UUID REFERENCES public.kunden(id) ON DELETE CASCADE,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  einsatzort_id UUID REFERENCES public.einsatzorte(id) ON DELETE SET NULL,
  vorlage_id UUID REFERENCES public.termin_vorlagen(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.termin_status NOT NULL DEFAULT 'unassigned',
  ist_ausnahme BOOLEAN DEFAULT false,
  ausnahme_grund TEXT,
  iststunden FLOAT8 DEFAULT 0,
  notizen TEXT,
  kategorie TEXT,
  absage_datum TIMESTAMPTZ,
  absage_kanal TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.termine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "termine_authenticated_all" ON public.termine
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_termine_updated_at
  BEFORE UPDATE ON public.termine
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indizes für termine
CREATE INDEX IF NOT EXISTS idx_termine_mitarbeiter ON public.termine(mitarbeiter_id);
CREATE INDEX IF NOT EXISTS idx_termine_kunden ON public.termine(kunden_id);
CREATE INDEX IF NOT EXISTS idx_termine_start_at ON public.termine(start_at);

-- --------------------------------------------------
-- 5.16 termin_aenderungen (abhängig von: termine, benutzer, kunden, mitarbeiter)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.termin_aenderungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  termin_id UUID NOT NULL REFERENCES public.termine(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.benutzer(id) ON DELETE CASCADE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  old_start_at TIMESTAMPTZ,
  old_end_at TIMESTAMPTZ,
  old_kunden_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  old_mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  new_start_at TIMESTAMPTZ,
  new_end_at TIMESTAMPTZ,
  new_kunden_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  new_mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  reason TEXT,
  approver_id UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.termin_aenderungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "termin_aenderungen_authenticated_all" ON public.termin_aenderungen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_termin_aenderungen_updated_at
  BEFORE UPDATE ON public.termin_aenderungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.17 dokumente (abhängig von: kunden, mitarbeiter, benutzer, termine)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dokumente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  dateiname TEXT NOT NULL,
  dateipfad TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  groesse_bytes FLOAT8 NOT NULL,
  beschreibung TEXT,
  kategorie TEXT NOT NULL DEFAULT 'kunde',
  kunden_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  termin_id UUID REFERENCES public.termine(id) ON DELETE SET NULL,
  hochgeladen_von UUID NOT NULL REFERENCES public.benutzer(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.dokumente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dokumente_authenticated_all" ON public.dokumente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_dokumente_updated_at
  BEFORE UPDATE ON public.dokumente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.18 notfallkontakte (abhängig von: kunden)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notfallkontakte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  telefon TEXT NOT NULL,
  bezug TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.notfallkontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notfallkontakte_authenticated_all" ON public.notfallkontakte
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.19 pending_registrations (abhängig von: benutzer)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  vorname TEXT,
  nachname TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ignored BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_registrations_authenticated_all" ON public.pending_registrations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.20 user_roles (abhängig von: benutzer, app_role enum)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.benutzer(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_authenticated_all" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.21 role_permissions (abhängig von: permissions, app_role enum)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_authenticated_all" ON public.role_permissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.22 audit_log (keine FK-Abhängigkeiten)
-- --------------------------------------------------
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

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_authenticated_all" ON public.audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.23 benachrichtigungen (abhängig von: benutzer, termine)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benachrichtigungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  benutzer_id UUID NOT NULL REFERENCES public.benutzer(id) ON DELETE CASCADE,
  termin_id UUID REFERENCES public.termine(id) ON DELETE SET NULL,
  titel TEXT NOT NULL,
  nachricht TEXT,
  typ TEXT NOT NULL DEFAULT 'info',
  gelesen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.benachrichtigungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benachrichtigungen_authenticated_all" ON public.benachrichtigungen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.24 leistungen (abhängig von: kunden, benutzer, kostentraeger, dokumente)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leistungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  art public.leistungsart NOT NULL,
  status public.leistungs_status NOT NULL DEFAULT 'beantragt',
  kostentraeger_id UUID REFERENCES public.kostentraeger(id) ON DELETE SET NULL,
  gueltig_von DATE NOT NULL,
  gueltig_bis DATE,
  kontingent_menge FLOAT8,
  kontingent_einheit TEXT,
  kontingent_zeitraum TEXT,
  kontingent_verbraucht FLOAT8 DEFAULT 0,
  bewilligung_datum DATE,
  bewilligung_aktenzeichen TEXT,
  bewilligung_dokument_id UUID REFERENCES public.dokumente(id) ON DELETE SET NULL,
  versichertennummer TEXT,
  pflegegrad_bei_bewilligung INTEGER,
  bemerkungen TEXT,
  beantragt_am DATE,
  beantragt_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  genehmigt_am DATE,
  genehmigt_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  beendet_am DATE,
  beendet_grund TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.leistungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leistungen_authenticated_all" ON public.leistungen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_leistungen_updated_at
  BEFORE UPDATE ON public.leistungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.25 leistungs_status_historie (abhängig von: leistungen, benutzer)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leistungs_status_historie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leistung_id UUID NOT NULL REFERENCES public.leistungen(id) ON DELETE CASCADE,
  alter_status public.leistungs_status,
  neuer_status public.leistungs_status NOT NULL,
  geaendert_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  grund TEXT,
  zusatz_daten JSONB,
  geaendert_am TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.leistungs_status_historie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leistungs_status_historie_authenticated_all" ON public.leistungs_status_historie
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.26 rechnungen (abhängig von: benutzer, kostentraeger, kunden)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rechnungen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnungsnummer TEXT NOT NULL UNIQUE,
  status public.rechnung_status NOT NULL DEFAULT 'entwurf',
  kostentraeger_id UUID REFERENCES public.kostentraeger(id) ON DELETE SET NULL,
  privat_kunde_id UUID REFERENCES public.kunden(id) ON DELETE SET NULL,
  empfaenger_name TEXT NOT NULL,
  empfaenger_adresse TEXT,
  abrechnungszeitraum_von DATE NOT NULL,
  abrechnungszeitraum_bis DATE NOT NULL,
  netto_betrag FLOAT8 NOT NULL DEFAULT 0,
  mwst_satz FLOAT8 NOT NULL DEFAULT 0,
  mwst_betrag FLOAT8 NOT NULL DEFAULT 0,
  brutto_betrag FLOAT8 NOT NULL DEFAULT 0,
  erstellt_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  freigegeben_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  freigegeben_am TIMESTAMPTZ,
  versendet_am TIMESTAMPTZ,
  bezahlt_am TIMESTAMPTZ,
  validierung_ergebnis JSONB,
  validierung_warnungen JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.rechnungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rechnungen_authenticated_all" ON public.rechnungen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_rechnungen_updated_at
  BEFORE UPDATE ON public.rechnungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.27 rechnungspositionen (abhängig von: rechnungen, kunden, mitarbeiter, leistungen, termine)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rechnungspositionen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnung_id UUID NOT NULL REFERENCES public.rechnungen(id) ON DELETE CASCADE,
  termin_id UUID NOT NULL REFERENCES public.termine(id) ON DELETE RESTRICT,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE RESTRICT,
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE SET NULL,
  leistung_id UUID REFERENCES public.leistungen(id) ON DELETE SET NULL,
  leistungsdatum DATE NOT NULL,
  leistungsbeginn TIMESTAMPTZ NOT NULL,
  leistungsende TIMESTAMPTZ NOT NULL,
  leistungsart TEXT NOT NULL,
  stunden FLOAT8 NOT NULL,
  stundensatz FLOAT8 NOT NULL DEFAULT 0,
  einzelbetrag FLOAT8 NOT NULL DEFAULT 0,
  ist_gueltig BOOLEAN NOT NULL DEFAULT true,
  validierung_hinweise JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.rechnungspositionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rechnungspositionen_authenticated_all" ON public.rechnungspositionen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.28 abrechnungs_historie (abhängig von: rechnungen, benutzer)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abrechnungs_historie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnung_id UUID NOT NULL REFERENCES public.rechnungen(id) ON DELETE CASCADE,
  aktion TEXT NOT NULL,
  alter_status public.rechnung_status,
  neuer_status public.rechnung_status,
  durchgefuehrt_von UUID REFERENCES public.benutzer(id) ON DELETE SET NULL,
  durchgefuehrt_am TIMESTAMPTZ DEFAULT now() NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.abrechnungs_historie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abrechnungs_historie_authenticated_all" ON public.abrechnungs_historie
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------
-- 5.29 abrechnungsregeln (keine FK-Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.abrechnungsregeln (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kostentraeger_typ public.kostentraeger_typ NOT NULL,
  leistungsart public.leistungsart NOT NULL,
  stundensatz FLOAT8,
  hoechstbetrag_monat FLOAT8,
  hoechstbetrag_jahr FLOAT8,
  min_pflegegrad INTEGER,
  max_pflegegrad INTEGER,
  gueltig_von DATE NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis DATE,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  beschreibung TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.abrechnungsregeln ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abrechnungsregeln_authenticated_all" ON public.abrechnungsregeln
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_abrechnungsregeln_updated_at
  BEFORE UPDATE ON public.abrechnungsregeln
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.30 leistungsnachweise (abhängig von: kunden, kostentraeger)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leistungsnachweise (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  kostentraeger_id UUID REFERENCES public.kostentraeger(id) ON DELETE SET NULL,
  monat INTEGER NOT NULL,
  jahr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'entwurf',
  geplante_stunden FLOAT8 NOT NULL DEFAULT 0,
  geleistete_stunden FLOAT8 NOT NULL DEFAULT 0,
  frozen_geplante_stunden FLOAT8,
  frozen_geleistete_stunden FLOAT8,
  ist_privat BOOLEAN NOT NULL DEFAULT false,
  privat_empfaenger_name TEXT,
  abweichende_rechnungsadresse BOOLEAN NOT NULL DEFAULT false,
  rechnungsadresse_name TEXT,
  rechnungsadresse_strasse TEXT,
  rechnungsadresse_plz TEXT,
  rechnungsadresse_stadt TEXT,
  cb_entlastungsleistung BOOLEAN NOT NULL DEFAULT false,
  cb_kombinationsleistung BOOLEAN NOT NULL DEFAULT false,
  cb_verhinderungspflege BOOLEAN NOT NULL DEFAULT false,
  cb_haushaltshilfe BOOLEAN NOT NULL DEFAULT false,
  cb_deckeln_45b BOOLEAN NOT NULL DEFAULT false,
  cb_deckeln_45b_betrag FLOAT8,
  unterschrift_kunde_bild TEXT,
  unterschrift_kunde_durch TEXT,
  unterschrift_kunde_zeitstempel TIMESTAMPTZ,
  unterschrift_gf_name TEXT,
  unterschrift_gf_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.leistungsnachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leistungsnachweise_authenticated_all" ON public.leistungsnachweise
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_leistungsnachweise_updated_at
  BEFORE UPDATE ON public.leistungsnachweise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.31 schedule_templates (keine kritischen Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  employee_id UUID,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_templates_authenticated_all" ON public.schedule_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_schedule_templates_updated_at
  BEFORE UPDATE ON public.schedule_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.32 development_todos (keine Abhängigkeiten)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.development_todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel TEXT NOT NULL,
  bereich TEXT NOT NULL,
  erledigt BOOLEAN NOT NULL DEFAULT false,
  erstellt_von TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.development_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "development_todos_authenticated_all" ON public.development_todos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_development_todos_updated_at
  BEFORE UPDATE ON public.development_todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------
-- 5.33 dev_modules, dev_features, dev_notes (Entwicklungsverwaltung)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dev_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  beschreibung TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.dev_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_modules_authenticated_all" ON public.dev_modules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.dev_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modul_id UUID REFERENCES public.dev_modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  beschreibung TEXT,
  status TEXT DEFAULT 'offen',
  prioritaet INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.dev_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_features_authenticated_all" ON public.dev_features
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.dev_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID REFERENCES public.dev_features(id) ON DELETE CASCADE,
  inhalt TEXT NOT NULL,
  erstellt_von TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.dev_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_notes_authenticated_all" ON public.dev_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
