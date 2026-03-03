-- ============================================
-- DATEN-EXPORT QUERIES für Supabase Migration
-- Projekt: EasyAssist Hub
-- Datum: 2026-01-23
-- ============================================
-- 
-- ANLEITUNG:
-- 1. Führe diese Queries in der Supabase SQL-Editor aus
-- 2. Exportiere jede Tabelle als CSV/JSON
-- 3. Nach der Migration: Importiere die Daten
-- ============================================

-- ============================================
-- EXPORT: BENUTZER (ohne sensible Auth-Daten)
-- ============================================
SELECT 
  id,
  email,
  rolle,
  status,
  vorname,
  nachname,
  geburtsdatum,
  created_at,
  updated_at
FROM public.benutzer
ORDER BY created_at;

-- ============================================
-- EXPORT: MITARBEITER
-- ============================================
SELECT 
  id,
  benutzer_id,
  vorname,
  nachname,
  telefon,
  strasse,
  plz,
  stadt,
  adresse,
  standort,
  zustaendigkeitsbereich,
  farbe_kalender,
  ist_aktiv,
  soll_wochenstunden,
  max_termine_pro_tag,
  created_at,
  updated_at
FROM public.mitarbeiter
ORDER BY created_at;

-- ============================================
-- EXPORT: KUNDEN
-- ============================================
SELECT 
  id,
  name,
  vorname,
  nachname,
  email,
  telefonnr,
  strasse,
  plz,
  stadt,
  stadtteil,
  adresse,
  geburtsdatum,
  pflegegrad,
  pflegekasse,
  versichertennummer,
  kasse_privat,
  kategorie,
  status,
  aktiv,
  startdatum,
  eintritt,
  austritt,
  sollstunden,
  stunden_kontingent_monat,
  mitarbeiter,
  notfall_name,
  notfall_telefon,
  angehoerige_ansprechpartner,
  begruendung,
  verhinderungspflege_status,
  kopie_lw,
  tage,
  sonstiges,
  farbe_kalender,
  created_at,
  updated_at
FROM public.kunden
ORDER BY created_at;

-- ============================================
-- EXPORT: KUNDEN_ZEITFENSTER
-- ============================================
SELECT 
  id,
  kunden_id,
  wochentag,
  von,
  bis,
  prioritaet
FROM public.kunden_zeitfenster;

-- ============================================
-- EXPORT: MITARBEITER_VERFUEGBARKEIT
-- ============================================
SELECT 
  id,
  mitarbeiter_id,
  wochentag,
  von,
  bis
FROM public.mitarbeiter_verfuegbarkeit;

-- ============================================
-- EXPORT: MITARBEITER_ABWESENHEITEN
-- ============================================
SELECT 
  id,
  mitarbeiter_id,
  zeitraum,
  grund,
  created_at
FROM public.mitarbeiter_abwesenheiten;

-- ============================================
-- EXPORT: TERMIN_VORLAGEN
-- ============================================
SELECT 
  id,
  titel,
  kunden_id,
  mitarbeiter_id,
  wochentag,
  start_zeit,
  dauer_minuten,
  intervall,
  gueltig_von,
  gueltig_bis,
  ist_aktiv,
  notizen,
  created_at,
  updated_at
FROM public.termin_vorlagen;

-- ============================================
-- EXPORT: TERMINE
-- ============================================
SELECT 
  id,
  titel,
  kunden_id,
  mitarbeiter_id,
  start_at,
  end_at,
  status,
  vorlage_id,
  ist_ausnahme,
  ausnahme_grund,
  iststunden,
  notizen,
  created_at,
  updated_at
FROM public.termine
ORDER BY start_at;

-- ============================================
-- EXPORT: TERMIN_AENDERUNGEN
-- ============================================
SELECT 
  id,
  termin_id,
  requested_by,
  status,
  old_start_at,
  old_end_at,
  old_kunden_id,
  old_mitarbeiter_id,
  new_start_at,
  new_end_at,
  new_kunden_id,
  new_mitarbeiter_id,
  reason,
  approver_id,
  approved_at,
  created_at,
  updated_at
FROM public.termin_aenderungen
ORDER BY created_at;

-- ============================================
-- EXPORT: DOKUMENTE (Metadaten - Dateien separat!)
-- ============================================
SELECT 
  id,
  titel,
  dateiname,
  dateipfad,
  mime_type,
  groesse_bytes,
  beschreibung,
  kategorie,
  kunden_id,
  mitarbeiter_id,
  hochgeladen_von,
  created_at,
  updated_at
FROM public.dokumente
ORDER BY created_at;

-- ============================================
-- EXPORT: PENDING_REGISTRATIONS
-- ============================================
SELECT 
  id,
  email,
  vorname,
  nachname,
  status,
  ignored,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at
FROM public.pending_registrations
ORDER BY created_at;

-- ============================================
-- EXPORT: AUDIT_LOG (optional, kann groß sein)
-- ============================================
SELECT 
  id,
  table_name,
  operation,
  row_id,
  old_data,
  new_data,
  actor_benutzer_id,
  changed_at
FROM public.audit_log
ORDER BY changed_at DESC
LIMIT 10000;

-- ============================================
-- STATISTIK: Übersicht der Datenmengen
-- ============================================
SELECT 
  'benutzer' as tabelle, COUNT(*) as anzahl FROM public.benutzer
UNION ALL SELECT 'mitarbeiter', COUNT(*) FROM public.mitarbeiter
UNION ALL SELECT 'kunden', COUNT(*) FROM public.kunden
UNION ALL SELECT 'kunden_zeitfenster', COUNT(*) FROM public.kunden_zeitfenster
UNION ALL SELECT 'mitarbeiter_verfuegbarkeit', COUNT(*) FROM public.mitarbeiter_verfuegbarkeit
UNION ALL SELECT 'mitarbeiter_abwesenheiten', COUNT(*) FROM public.mitarbeiter_abwesenheiten
UNION ALL SELECT 'termin_vorlagen', COUNT(*) FROM public.termin_vorlagen
UNION ALL SELECT 'termine', COUNT(*) FROM public.termine
UNION ALL SELECT 'termin_aenderungen', COUNT(*) FROM public.termin_aenderungen
UNION ALL SELECT 'dokumente', COUNT(*) FROM public.dokumente
UNION ALL SELECT 'pending_registrations', COUNT(*) FROM public.pending_registrations
UNION ALL SELECT 'audit_log', COUNT(*) FROM public.audit_log
ORDER BY tabelle;
