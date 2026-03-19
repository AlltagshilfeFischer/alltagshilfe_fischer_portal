---
name: db-schema
description: Datenbankschema der Alltagshilfe Fischer Anwendung. Automatisch laden wenn Datenbankabfragen, Migrationen, Supabase-Queries, Tabellennamen oder Spaltennamen relevant sind.
user-invocable: false
---

# Datenbankschema – Alltagshilfe Fischer

Supabase (PostgreSQL). Alle Typen: `src/integrations/supabase/types.ts`.

## ENUMs

```sql
app_role:              'globaladmin' | 'geschaeftsfuehrer' | 'admin' | 'mitarbeiter' | 'buchhaltung'
approval_status:       'pending' | 'approved' | 'rejected'
benutzer_status:       'pending' | 'eingeladen' | 'approved' | 'rejected'
kostentraeger_typ:     'pflegekasse' | 'krankenkasse' | 'kommune' | 'privat' | 'beihilfe'
leistungs_status:      'beantragt' | 'genehmigt' | 'aktiv' | 'pausiert' | 'beendet'
leistungsart:          'entlastungsleistung' | 'verhinderungspflege' | 'kurzzeitpflege' | 'pflegesachleistung' | 'privat' | 'sonstige'
rechnung_status:       'entwurf' | 'freigegeben' | 'versendet' | 'bezahlt' | 'storniert'
recurrence_interval:   'none' | 'weekly' | 'biweekly' | 'monthly'
standort:              'Hannover' (⚠️ Hildesheim & Peine fehlen noch im ENUM!)
termin_status:         'unassigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'abgerechnet' | 'bezahlt' | 'nicht_angetroffen' | 'abgesagt_rechtzeitig'
```

> Rollen-Hierarchie im Code: `globaladmin > geschaeftsfuehrer > admin > mitarbeiter / buchhaltung`

## Kern-Tabellen

### `benutzer`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID PK | |
| email | CITEXT UNIQUE | |
| rolle | user_rolle | |
| status | benutzer_status | DEFAULT 'pending' |
| vorname, nachname | TEXT | |
| geburtsdatum | DATE | |

### `mitarbeiter`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID PK | |
| benutzer_id | UUID FK → benutzer | nullable |
| vorname, nachname | TEXT | |
| telefon, strasse, plz, stadt, adresse | TEXT | |
| standort | standort ENUM | DEFAULT 'Hannover' |
| farbe_kalender | TEXT | DEFAULT '#3B82F6' |
| ist_aktiv | BOOLEAN | DEFAULT true |
| soll_wochenstunden | NUMERIC | |
| max_termine_pro_tag | INTEGER | |

### `kunden`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID PK | |
| name, vorname, nachname | TEXT | |
| email, telefonnr | TEXT | |
| strasse, plz, stadt, stadtteil, adresse | TEXT | |
| geburtsdatum | DATE | |
| pflegegrad | SMALLINT | |
| pflegekasse, versichertennummer | TEXT | |
| aktiv | BOOLEAN | DEFAULT true |
| stunden_kontingent_monat | NUMERIC | DEFAULT 0 |
| mitarbeiter | UUID FK → mitarbeiter | Hauptbetreuer |
| farbe_kalender | TEXT | DEFAULT '#10B981' |

### `termine` ⚠️ KRITISCH
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID PK | |
| titel | TEXT | |
| kunden_id | UUID FK → kunden | |
| mitarbeiter_id | UUID FK → mitarbeiter | nullable |
| start_at | TIMESTAMPTZ | |
| end_at | TIMESTAMPTZ | |
| status | termin_status | DEFAULT 'unassigned' |
| vorlage_id | UUID FK → termin_vorlagen | NULL = Einzeltermin |
| ist_ausnahme | BOOLEAN | DEFAULT false |
| ausnahme_grund | TEXT | |
| iststunden | NUMERIC | DEFAULT 0 |

### `termin_vorlagen` (Regeltermine-Templates)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | UUID PK | |
| titel | TEXT | |
| kunden_id | UUID FK → kunden | |
| mitarbeiter_id | UUID FK → mitarbeiter | nullable |
| wochentag | SMALLINT | 0=Sonntag … 6=Samstag |
| start_zeit | TIME | |
| dauer_minuten | INTEGER | DEFAULT 60 |
| intervall | recurrence_interval | |
| gueltig_von | DATE | |
| gueltig_bis | DATE | nullable |
| ist_aktiv | BOOLEAN | DEFAULT true |

#### `termine` – Neue Felder (Migration 20260318)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| kategorie | TEXT | Erstgespräch, Schulung, Intern, Regelbesuch, Sonstiges |
| absage_datum | DATE | Wann wurde abgesagt? |
| absage_kanal | TEXT | Telefonisch, E-Mail, Persönlich, WhatsApp, Sonstiges |

### Weitere Tabellen
- `kunden_zeitfenster` – Verfügbarkeitsfenster pro Kunde (wochentag, von, bis, prioritaet)
- `mitarbeiter_verfuegbarkeit` – Verfügbarkeit pro Mitarbeiter (wochentag, von, bis)
- `mitarbeiter_abwesenheiten` – Abwesenheiten mit `zeitraum TSTZRANGE`
- `termin_aenderungen` – Änderungsanfragen (approval_status, old_*/new_* Felder)
- `dokumente` – Datei-Uploads (kunden_id ODER mitarbeiter_id)
- `pending_registrations` – Offene Registrierungsanfragen
- `audit_log` – BIGSERIAL, table_name, operation, row_id, old_data JSONB, new_data JSONB
- `budget_transactions` – Budget-Verbrauch (client_id, service_type, hours, total_amount, billed)
- `care_levels` – Pflegegrad-Budgets (sachleistung_monat, kombi_max_40_prozent_monat)
- `tariffs` – Stundensätze (service_type, hourly_rate, travel_flat_per_visit)
- `abrechnungsregeln` – Pro-Kunde Regeln (kostentraeger_typ, stundensatz, hoechstbetrag)
- `rechnungen` – Rechnungen (status: entwurf→freigegeben→versendet→bezahlt)
- `rechnungspositionen` – Zeilen pro Rechnung
- `leistungen` – Anträge (art, status: beantragt→genehmigt→aktiv)
- `leistungsnachweise` – Monats-LN (status, unterschrift_kunde, unterschrift_firma)

## Helper Functions (PostgreSQL)

```sql
public.is_admin(user_id uuid) → boolean           -- ⚠️ Wird obsolet nach admin-Refactor
public.is_admin_secure(user_id uuid) → boolean     -- Prüft admin/gf/globaladmin
public.is_admin_or_higher(user_id uuid) → boolean  -- Gleich wie is_admin_secure
public.get_user_rolle(p_user_id uuid) → text
public.has_role(user_id uuid, role app_role) → boolean
```

## Wichtige Indizes

```sql
idx_termine_mitarbeiter  ON termine(mitarbeiter_id)
idx_termine_kunden       ON termine(kunden_id)
idx_termine_start_at     ON termine(start_at)
idx_kunden_aktiv         ON kunden(aktiv)
idx_mitarbeiter_aktiv    ON mitarbeiter(ist_aktiv)
```

## Query-Muster

```typescript
// Immer error prüfen
const { data, error } = await supabase
  .from('termine')
  .select('*, kunden(*), mitarbeiter(*)')
  .eq('status', 'scheduled');
if (error) throw error;

// Typen aus types.ts nutzen
import { Database } from '@/integrations/supabase/types';
type Termin = Database['public']['Tables']['termine']['Row'];
```

Detaillierte Schema-Referenz: [schema-reference.md](schema-reference.md)
