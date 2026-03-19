# Vollstaendige Schema-Referenz

## RLS (Row Level Security)

Supabase RLS ist aktiv. Queries laufen mit dem angemeldeten Nutzer-Kontext.
`SECURITY DEFINER` Funktionen laufen mit Superuser-Rechten.

## Helper Functions

```sql
public.is_admin(user_id uuid) → boolean     -- true fuer admin/geschaeftsfuehrer/globaladmin
public.get_user_rolle(p_user_id uuid) → text -- gibt Rolle als Text zurueck
public.get_user_roles(_user_id uuid) → app_role[]
public.has_role(_user_id uuid, _role app_role) → boolean
```

## Trigger

- `sync_mitarbeiter_name` – Synchronisiert vorname/nachname zwischen benutzer ↔ mitarbeiter
- `check_planungsregeln` – Validiert Verfuegbarkeit, Abwesenheit, Tageslimit vor INSERT/UPDATE in termine

## Zeitzonenhandling

Alle Zeitstempel: `TIMESTAMPTZ` (UTC gespeichert).
Fuer Anzeige immer `Europe/Berlin` verwenden:

```typescript
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
const berlinTime = utcToZonedTime(utcDate, 'Europe/Berlin');
```

## Budget & Abrechnungs-Tabellen

### `budget_transactions`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| client_id | UUID FK → kunden | |
| service_date | DATE | |
| hours | NUMERIC | |
| visits | INTEGER | |
| service_type | TEXT | ENTLASTUNG, KOMBI, VERHINDERUNG, PRIVAT |
| hourly_rate | NUMERIC | |
| travel_flat_total | NUMERIC | |
| total_amount | NUMERIC | |
| source | TEXT | APLANO_IMPORT, MANUAL |
| billed | BOOLEAN | |

### `care_levels`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| pflegegrad | INTEGER PK | 0-5 |
| sachleistung_monat | NUMERIC | Monatliches Sachleistungsbudget |
| kombi_max_40_prozent_monat | NUMERIC | 40% Umwandlung |

### `tariffs`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| service_type | TEXT | ENTLASTUNG, KOMBI, VERHINDERUNG |
| hourly_rate | NUMERIC | |
| travel_flat_per_visit | NUMERIC | |
| active | BOOLEAN | |

### `rechnungen`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| rechnungsnummer | TEXT UNIQUE | |
| status | rechnung_status | entwurf → freigegeben → versendet → bezahlt |
| gesamt_betrag | NUMERIC | |
| kunden_id | UUID FK → kunden | |

### `abrechnungsregeln`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| kostentraeger_typ | kostentraeger_typ | |
| leistungsart | leistungsart | |
| ist_aktiv | BOOLEAN | |
| stundensatz | NUMERIC | |

### `leistungen`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| kunden_id | UUID FK → kunden | |
| art | leistungsart | |
| status | leistungs_status | beantragt → genehmigt → aktiv |
| genehmigt_am | DATE | |
| gueltig_von, gueltig_bis | DATE | |

### `kostentraeger`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | UUID PK | |
| name | TEXT | |
| typ | kostentraeger_typ | |

## Migrationspfad

Migrations: `supabase/migrations/*.sql` (100+ Dateien, Aug 2025 – Maerz 2026)

```bash
supabase migration new <beschreibung>
```

## Standorte

```typescript
const STANDORTE = ['Hannover', 'Hildesheim', 'Peine'] as const;
// ACHTUNG: DB-ENUM hat aktuell nur 'Hannover'!
```

## Wochentage (SMALLINT)

```
0 = Sonntag, 1 = Montag, 2 = Dienstag, 3 = Mittwoch,
4 = Donnerstag, 5 = Freitag, 6 = Samstag
```

## Supabase Edge Functions

| Function | Zweck |
|----------|-------|
| `parse-appointment-text` | KI: Text → Termin-Daten |
| `parse-kunden-text` | KI: Text → Kunden-Daten |
| `parse-mitarbeiter-text` | KI: Text → Mitarbeiter-Daten |
| `parse-time-windows` | KI: Text → Zeitfenster |
| `suggest-employees` | KI: Mitarbeiter-Matching |
| `dashboard-assistant` | KI: Chat (SSE Streaming) |
| `approve-benutzer` | Benutzer genehmigen |
| `reject-benutzer` | Benutzer ablehnen |
| `batch-billing` | Sammelabrechnung |
| `auto-complete-appointments` | Auto-Status-Update |
| `send-email` | E-Mail versenden (Resend API) |
| `reset-password-email` | Passwort-Reset |
| `activate-mitarbeiter` | Mitarbeiter aktivieren |
| `delete-mitarbeiter` | Mitarbeiter soft-delete |
| `force-signout` | Session invalidieren |
| `assign-employee-to-customer` | MA-Kunden-Zuordnung |
