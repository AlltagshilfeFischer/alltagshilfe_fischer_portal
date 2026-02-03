-- Abrechnungs-Engine: Rechnungen und Positionen mit vollständigem Audit-Trail

-- Rechnungsstatus Enum
CREATE TYPE public.rechnung_status AS ENUM (
  'entwurf',      -- Draft, being prepared
  'freigegeben',  -- Approved for sending
  'versendet',    -- Sent to Kostenträger
  'bezahlt',      -- Paid
  'storniert'     -- Cancelled
);

-- Haupttabelle: Rechnungen
CREATE TABLE public.rechnungen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnungsnummer TEXT NOT NULL UNIQUE,
  
  -- Empfänger (Kostenträger oder Privat)
  kostentraeger_id UUID REFERENCES public.kostentraeger(id),
  privat_kunde_id UUID REFERENCES public.kunden(id),
  empfaenger_name TEXT NOT NULL,
  empfaenger_adresse TEXT,
  
  -- Zeitraum der Abrechnung
  abrechnungszeitraum_von DATE NOT NULL,
  abrechnungszeitraum_bis DATE NOT NULL,
  
  -- Beträge
  netto_betrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  mwst_satz NUMERIC(4,2) NOT NULL DEFAULT 0,
  mwst_betrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  brutto_betrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Status & Workflow
  status rechnung_status NOT NULL DEFAULT 'entwurf',
  erstellt_von UUID REFERENCES public.benutzer(id),
  freigegeben_von UUID REFERENCES public.benutzer(id),
  freigegeben_am TIMESTAMP WITH TIME ZONE,
  versendet_am TIMESTAMP WITH TIME ZONE,
  bezahlt_am TIMESTAMP WITH TIME ZONE,
  
  -- Validierungsergebnisse (JSON für Flexibilität)
  validierung_ergebnis JSONB,
  validierung_warnungen JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rechnungspositionen (einzelne Termine)
CREATE TABLE public.rechnungspositionen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnung_id UUID NOT NULL REFERENCES public.rechnungen(id) ON DELETE CASCADE,
  
  -- Referenzen
  termin_id UUID NOT NULL REFERENCES public.termine(id),
  leistung_id UUID REFERENCES public.leistungen(id),
  kunden_id UUID NOT NULL REFERENCES public.kunden(id),
  mitarbeiter_id UUID REFERENCES public.mitarbeiter(id),
  
  -- Leistungsdaten (kopiert für Revisionssicherheit)
  leistungsart TEXT NOT NULL,
  leistungsdatum DATE NOT NULL,
  leistungsbeginn TIME NOT NULL,
  leistungsende TIME NOT NULL,
  
  -- Stunden und Beträge
  stunden NUMERIC(5,2) NOT NULL,
  stundensatz NUMERIC(8,2) NOT NULL DEFAULT 0,
  einzelbetrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Validierung
  ist_gueltig BOOLEAN NOT NULL DEFAULT true,
  validierung_hinweise JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abrechnungsregeln pro Kostenträger-Typ
CREATE TABLE public.abrechnungsregeln (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Geltungsbereich
  kostentraeger_typ public.kostentraeger_typ NOT NULL,
  leistungsart public.leistungsart NOT NULL,
  
  -- Regeln
  min_pflegegrad SMALLINT,
  max_pflegegrad SMALLINT,
  stundensatz NUMERIC(8,2),
  hoechstbetrag_monat NUMERIC(10,2),
  hoechstbetrag_jahr NUMERIC(10,2),
  
  -- Gültigkeit
  gueltig_von DATE NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis DATE,
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadaten
  beschreibung TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abrechnungs-Historie (Append-Only Audit Log)
CREATE TABLE public.abrechnungs_historie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rechnung_id UUID NOT NULL REFERENCES public.rechnungen(id),
  
  -- Was ist passiert
  aktion TEXT NOT NULL,
  alter_status rechnung_status,
  neuer_status rechnung_status,
  
  -- Wer und wann
  durchgefuehrt_von UUID REFERENCES public.benutzer(id),
  durchgefuehrt_am TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Details
  details JSONB,
  
  -- Immutable
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes für Performance
CREATE INDEX idx_rechnungen_status ON public.rechnungen(status);
CREATE INDEX idx_rechnungen_zeitraum ON public.rechnungen(abrechnungszeitraum_von, abrechnungszeitraum_bis);
CREATE INDEX idx_rechnungen_kostentraeger ON public.rechnungen(kostentraeger_id);
CREATE INDEX idx_rechnungspositionen_rechnung ON public.rechnungspositionen(rechnung_id);
CREATE INDEX idx_rechnungspositionen_termin ON public.rechnungspositionen(termin_id);
CREATE INDEX idx_abrechnungsregeln_lookup ON public.abrechnungsregeln(kostentraeger_typ, leistungsart, ist_aktiv);

-- Trigger für updated_at
CREATE TRIGGER update_rechnungen_updated_at
  BEFORE UPDATE ON public.rechnungen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_abrechnungsregeln_updated_at
  BEFORE UPDATE ON public.abrechnungsregeln
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.rechnungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rechnungspositionen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abrechnungsregeln ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abrechnungs_historie ENABLE ROW LEVEL SECURITY;

-- Admins können alles
CREATE POLICY "Admins manage rechnungen" ON public.rechnungen
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage rechnungspositionen" ON public.rechnungspositionen
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage abrechnungsregeln" ON public.abrechnungsregeln
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins read abrechnungs_historie" ON public.abrechnungs_historie
  FOR SELECT USING (is_admin(auth.uid()));

-- Trigger für automatische Historie
CREATE OR REPLACE FUNCTION public.log_rechnung_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.abrechnungs_historie (
      rechnung_id,
      aktion,
      alter_status,
      neuer_status,
      durchgefuehrt_von,
      details
    ) VALUES (
      NEW.id,
      'status_aenderung',
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object(
        'vorher', to_jsonb(OLD),
        'nachher', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_rechnung_status_changes
  AFTER UPDATE ON public.rechnungen
  FOR EACH ROW EXECUTE FUNCTION public.log_rechnung_status_change();

-- Sequence für Rechnungsnummern (Format: RE-YYYY-NNNN)
CREATE SEQUENCE public.rechnungsnummer_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_rechnungsnummer()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'RE-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || 
         LPAD(nextval('public.rechnungsnummer_seq')::TEXT, 4, '0');
$$;

-- Kommentare für Dokumentation
COMMENT ON TABLE public.rechnungen IS 'Abrechnungsdokumente mit vollständigem Status-Workflow';
COMMENT ON TABLE public.rechnungspositionen IS 'Einzelne abgerechnete Termine, kopiert für Revisionssicherheit';
COMMENT ON TABLE public.abrechnungsregeln IS 'Regelbasierte Abrechnungslogik pro Kostenträger-Typ und Leistungsart';
COMMENT ON TABLE public.abrechnungs_historie IS 'Append-Only Audit-Log für alle Rechnungsänderungen';