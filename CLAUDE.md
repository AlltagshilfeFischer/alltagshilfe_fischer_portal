# Easy Assist Hub – Claude Code Instructions

## Projektübersicht

**Alltagshilfe Fischer GbR** – Care-Management-System für ambulante Alltagshilfe.
Verwaltet Mitarbeiter, Kunden, Termine, Abrechnung & Budgetlogik, Leistungsnachweise.

- **Standorte:** Hannover, Hildesheim, Peine
- **Auftraggeber:** Alltagshilfe Fischer GbR (Florian Fischer, Luca Grützner)
- **Abnahme-Deadline:** 31.03.2026
- **Sprache UI:** Deutsch | **Sprache Code:** Englisch

---

## Rollen (4 Rollen – „admin"/Disponent wird abgeschafft!)

```
globaladmin       → Hardcoded (admin@af-verwaltung.de). Vollzugriff, alle Standorte.
                    Wird bei Übergabe an Fischer übertragen.
geschaeftsfuehrer → Quasi-Admin pro Standort. Volle Planungs-/Änderungsrechte.
                    Kann Nutzer verwalten, Daten löschen, Einstellungen ändern.
buchhaltung       → Alles LESEN + Budget/Abrechnung bearbeiten.
                    KEIN Löschen. KEIN User-Management. KEIN Dienstplan-Editing.
mitarbeiter       → Nur eigene Termine, Zeiten anpassen (mit Freigabe),
                    Leistungsnachweis unterschreiben. Sonst NICHTS.
```

**⚠️ MIGRATION NÖTIG:** `admin` (Disponent) Rolle ist in 34+ Stellen im Code referenziert.
Muss in `geschaeftsfuehrer` zusammengeführt werden. Betrifft:
- `useUserRole.tsx` (isAdmin, isDisponent helpers)
- `Dashboard.tsx` (Route Guards)
- `AppSidebar.tsx` (10 requiredRoles-Einträge)
- `BenutzerverwaltungNeu.tsx` (Role Labels, SelectItems)
- 6 Edge Functions (Authorization checks)
- DB Functions (`is_admin`, `is_admin_or_higher`, `get_user_rolle`)
- app_role ENUM Migration

---

## Modul-Status & GAPs (Stand 19.03.2026)

| Modul | Status | Kritische Gaps |
|-------|--------|---------------|
| Auth & Benutzerverwaltung | ~95% | "Merken"-Checkbox, admin-Rolle entfernen |
| Kundenverwaltung | ~85% | Vertrags-/Antrags-PDFs fehlen |
| Mitarbeiterverwaltung | ~85% | Standort-ENUM nur "Hannover" |
| **Dienstplan/Kalender** | **~65%** | **Label-System 65%, Absage-Logik 60%, Copy 0%, Validierung 70%** |
| Mitarbeiter-Frontend | ~90% | Push-Notifications fehlen |
| **Leistungsnachweise** | **~85%** | **GF-Stempel, Reminder-System fehlen** |
| **Abrechnung/Budget** | **~70%** | **Invoice-UI 40%, Tax 10% (kein 19%), Regeln-UI 20%** |
| **Reporting** | **~45%** | **Keine Billing/Budget-Reports** |
| Benachrichtigungen | ~15% | E-Mail-Trigger, Reminder fehlen |

---

## Dienstplan – Detailstatus

### Was funktioniert
- DnD (100%, @dnd-kit) mit Conflict-Warning
- Regeltermine (80%, termin_vorlagen → termine Generierung)
- Status-Workflow (95%, 9 Status-Werte mit Farben/Badges)
- Cut/Paste (funktional, aber kein Copy)
- Overlap-Erkennung (visuelle rote Border + Conflict-Counter)

### Was fehlt/kaputt
- **Label-System**: 5 Kategorien existieren (Erstgespräch, Schulung, Intern, Regelbesuch, Sonstiges) – fehlen: Meeting, Blocker, Bewerbungsgespräch
- **Absage-Logik**: absage_datum + absage_kanal Felder existieren, aber KEINE 2-Tage-Regel (kurzfristig vs. rechtzeitig), keine Auto-Transition
- **Copy-Feature**: 0% – nur Cut/Paste, kein Duplicate
- **Pausen-Validierung**: Keine 15min-Mindestpause zwischen Terminen
- **Abwesenheits-Check**: Abwesenheiten werden bei DnD NICHT geprüft
- **BUG**: Series-Move Conflict-Check ohne targetDate-Argument (silent miss)
- **Kein State-Machine**: Jeder Status → jeder andere möglich (keine Transition-Rules)

### Termin-Labels (Spec §9.5 – Zielzustand)
```
Standard (Kundentermin), Erstgespräch, Meeting, Schulung,
Bewerbungsgespräch, Blocker (nicht Arbeitszeit),
Absage Kunde kurzfristig (< 2 Tage → abrechenbar),
Absage Kunde rechtzeitig (≥ 2 Tage → nicht abrechenbar),
Ausfall MA/Firma (nicht abrechenbar, Kommentar Pflicht)
```

---

## Abrechnung – Detailstatus

### Budget-Typen (Spec §8.1)
```
§45b Entlastungsbetrag   → 131€/Monat, Übertrag bis 30.06. Folgejahr
§39  Verhinderungspflege  → 3.539€/Jahr
§45a Umwandlungsanspruch  → max 40% Sachleistung
§38  Haushaltshilfe       → ärztl. Verordnung (NICHT IMPLEMENTIERT)
     Privatleistung       → unbegrenzt
```

### Was funktioniert
- **Batch-Billing** (Edge Function): Voll funktional, erstellt Rechnungen + Positionen
- **Budget-Tracking**: 95% – alle 4 Typen, FIFO-Übertrag, Allocation-Algorithmus
- **Leistungsnachweis**: PDF-Print, Offline-Unterschriften, Billing-Checkboxen
- **Budget-Berechnung**: Priorisierung (KOMBI → Vorjahresrest → VP → Entlastung → Privat)

### Was fehlt
- **Invoice-UI**: Backend erstellt Rechnungen, aber KEINE Seite zum Anzeigen/Verwalten
- **Tax-Logik**: Nur 0% (Pflege). KEIN 19% für Privatleistungen ohne Pflegegrad
- **Abrechnungsregeln-UI**: DB-Schema vorhanden, kein Frontend
- **§38 SGB V**: Komplett fehlend (Phase 2?)
- **GF-Stempel**: Leistungsnachweis hat Platzhalter, aber kein Upload/Generation
- **Reminder**: Keine Erinnerungen für fehlende Unterschriften/Anträge
- **Restbetrags-Split**: Logik vorhanden, aber nicht E2E verifiziert

### Prüfungskette (Spec §12)
```
1. Status-Check: Termin = "completed"?
2. Budget-Check: Topf hat Guthaben?
3. Dokumenten-Check: Anträge/Nachweise vorhanden?
4. Regelprüfung: Kundenspezifische Abrechnungsregel anwenden
5. Split bei Restbudget (z.B. 20€ Kasse + 19€ Privat)
```

### Steuerlogik (Spec §12.1)
```
0%  → Pflegeleistung (§4 Nr. 16 UStG) — implementiert
19% → Privatleistung ohne Pflegegrad — FEHLT!
```

---

## Entwicklungs-Commands

```bash
npm run dev          # Dev-Server auf Port 8080
npm run build        # Production Build
npm run build:dev    # Development Build (mit Source Maps)
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript-Check ohne Build
```

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite 5 (Port 8080, SWC) |
| UI | shadcn/ui (Radix UI) + Tailwind CSS 3 |
| Routing | React Router v6 (client-side, **kein Next.js**) |
| State | TanStack React Query v5 + Context API |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | OpenAI GPT-4o-mini via Supabase Edge Functions |
| Email | Resend API |
| DnD | @dnd-kit |
| Dates | date-fns v4 (German locale) |
| Charts | recharts |
| CSV | papaparse |

**Path Alias:** `@` → `src/`
**Supabase Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Architektur

### Provider-Wrapping (Reihenfolge kritisch)
```
AuthProvider → ForcePasswordChange → QueryClientProvider → BrowserRouter → Routes
```

### Routing
```
/                              → Login
/dashboard                     → DashboardHome
/dashboard/mein-bereich        → MitarbeiterDashboard (mitarbeiter)
/dashboard/controlboard/
  schedule-builder             → ScheduleBuilderModern (gf+)
  master-data                  → MasterData (gf+)
  admin                        → BenutzerverwaltungNeu (gf/globaladmin)
  dokumentenverwaltung         → Dokumentenverwaltung (gf+)
  leistungsnachweise           → Leistungsnachweise (gf+)
  budgettracker                → BudgetTracker (gf+, buchhaltung)
  budgettracker/:kundenId      → BudgetTrackerDetail
  reporting                    → Reporting (gf+, buchhaltung)
  aktivitaetslog               → AktivitaetsLog (globaladmin)
/dashboard/settings            → Settings (gf/globaladmin)
/chat                          → ChatPage (AI)
```

### Auth-System
- Supabase Auth mit Email/Password
- `useAuth()` – Session-Persistence, Token-Refresh, Audit-Logging
- `useUserRole()` – Rollenabfrage, Permissions (isGlobalAdmin, isGeschaeftsfuehrer, isAdmin, isBuchhaltung)
- Audit-Trail in `audit_log`

### Data Layer
- **Client:** `src/integrations/supabase/client.ts`
- **Typen:** `src/integrations/supabase/types.ts` – IMMER nutzen
- **Domain:** `src/types/domain.ts`
- **Hooks:** `src/hooks/` – Alle DB-Zugriffe

---

## Datenbankarchitektur

### Termin-System (KRITISCH)
```
Einzeltermin:  vorlage_id = NULL
Regeltermin:   vorlage_id gesetzt, ist_ausnahme = false
Ausnahme:      vorlage_id gesetzt, ist_ausnahme = true → NICHT überschreiben!
```

**Goldene Regel:** Bestehende Termine NIEMALS überschreiben – nur fehlende hinzufügen!

### Kern-Tabellen
- `termine` – Status: unassigned|scheduled|in_progress|completed|cancelled|abgerechnet|bezahlt|nicht_angetroffen|abgesagt_rechtzeitig
- `termin_vorlagen` – Regeltermin-Templates
- `mitarbeiter` – Profile (Kalenderfarbe, Workload, Standort)
- `kunden` – Profile (Pflegegrad, Budget-Felder, Abrechnungsregeln)
- `benutzer` – Auth-Accounts (app_role Enum)
- `budget_transactions` – Budget-Verbrauch
- `care_levels` – Pflegegrad-Budgets (PG0-5)
- `tariffs` – Stundensätze
- `abrechnungsregeln` – Kundenspezifische Regeln
- `rechnungen` + `rechnungspositionen` – Generierte Rechnungen
- `leistungen` – Anträge (Entlastung, VP, Kombi)
- `leistungsnachweise` – Monatsweise LN mit Unterschriften
- `dokumente` – Datei-Uploads
- `termin_aenderungen` – Änderungsanfragen
- `mitarbeiter_abwesenheiten` – Urlaub/Krankheit
- `mitarbeiter_verfuegbarkeit` – Wöchentliche Verfügbarkeit
- `kunden_zeitfenster` – Kundenpräferenzen
- `audit_log` – Sicherheits-Trail

### DB-Enums
```
termin_status:     unassigned|scheduled|in_progress|completed|cancelled|abgerechnet|bezahlt|nicht_angetroffen|abgesagt_rechtzeitig
app_role:          globaladmin|geschaeftsfuehrer|admin|mitarbeiter|buchhaltung  (⚠️ admin wird entfernt!)
leistungsart:      entlastungsleistung|verhinderungspflege|kurzzeitpflege|pflegesachleistung|privat|sonstige
kostentraeger_typ: pflegekasse|krankenkasse|kommune|privat|beihilfe
rechnung_status:   entwurf|freigegeben|versendet|bezahlt|storniert
leistungs_status:  beantragt|genehmigt|aktiv|pausiert|beendet
standort:          Hannover  (⚠️ Hildesheim & Peine fehlen!)
```

---

## Wichtige Datei-Pfade

```
src/
├── App.tsx                              # Provider-Setup + Routes
├── integrations/supabase/
│   ├── client.ts                        # Supabase-Client
│   └── types.ts                         # DB-Typen (IMMER nutzen)
├── hooks/
│   ├── useAuth.tsx                      # Auth + Session
│   ├── useUserRole.tsx                  # Rollen & Permissions
│   ├── useAppointments.ts              # Termin-Queries
│   ├── useCustomers.ts                 # Kunden-Queries
│   ├── useEmployees.ts                 # MA-Queries
│   ├── useCustomerMutations.ts         # Kunden CRUD
│   ├── useBudgetTransactions.ts        # Budget Queries+Mutations
│   └── useReportingData.ts             # Reporting Queries
├── lib/pflegebudget/
│   └── budgetCalculations.ts           # Budget-Berechnung (FIFO, Priorisierung)
├── types/domain.ts                      # Business Types
├── components/
│   ├── ui/                              # shadcn/ui (50+)
│   ├── dashboard/                       # Layout, Sidebar
│   ├── schedule/                        # Kalender (calendar/, dialogs/, panels/, ai/)
│   ├── customers/                       # Kunden-Wizard, Import
│   ├── mitarbeiter/                     # MA-Features
│   ├── leistungsnachweis/               # LN-Preview + Print
│   ├── reporting/                       # Report-Komponenten
│   └── auth/                            # Login, Registration
└── pages/controlboard/
    ├── ScheduleBuilderModern.tsx        # Haupt-Kalender (1425 Zeilen!)
    ├── MasterData.tsx                   # Kundenverwaltung
    ├── BenutzerverwaltungNeu.tsx        # User-Management
    ├── Leistungsnachweise.tsx           # LN-Verwaltung (1128 Zeilen)
    ├── Reporting.tsx                    # Reporting (523 Zeilen)
    ├── Dokumentenverwaltung.tsx         # Dokumente
    └── budgettracker/                   # Budget-Übersicht + Detail

supabase/functions/
├── batch-billing/                       # Sammelabrechnung (funktional)
├── auto-complete-appointments/          # Auto-Status-Update
├── parse-appointment-text/              # AI: Text → Termin
├── parse-kunden-text/                   # AI: Text → Kunden
├── parse-mitarbeiter-text/              # AI: Text → MA
├── suggest-employees/                   # AI: MA-Matching
├── dashboard-assistant/                 # AI: Chat (SSE)
├── send-email/                          # Resend API
└── _shared/                             # CORS, OpenAI, Errors
```

---

## Code-Konventionen

### TypeScript
- **Kein `any`** – Typen aus `types.ts` oder `domain.ts`
- Interfaces über Type-Aliases
- DB-Typen: `Database['public']['Tables']['tabelle']['Row']`

### React
- Business-Logik in Custom Hooks
- Max 5-6 `useState` – sonst Reducer
- `useMemo`/`useCallback` bei teuren Berechnungen
- Komponenten max ~150 Zeilen

### Error Handling
- Kein silent swallow
- Toast: `import { toast } from 'sonner'`
- Supabase: `const { data, error } = ...` dann `if (error) throw error`

### UI
- Nur shadcn/ui + lucide-react + Tailwind
- Kein `style={{}}`, keine eigenen Primitives

---

## Verfügbare Skills

| Skill | Beschreibung | Aufruf |
|-------|-------------|--------|
| `/db-schema` | DB-Schema nachschlagen | Auto bei DB-Queries |
| `/dienstplan` | Termin-/Kalenderlogik | Auto bei Schedule-Arbeit |
| `/abrechnung` | Budget-/Abrechnungslogik | Auto bei Budget-Arbeit |
| `/reporting` | Reporting-Funktionen | Auto bei Auswertungen |
| `/feature` | Feature-Entwicklung | `/feature [Beschreibung]` |
| `/review` | Code-Review | `/review [Datei]` |
| `/commit` | Git-Commit | `/commit` |
| `/migration` | Supabase-Migration | `/migration [Beschreibung]` |
| `/kunden-anlegen` | Kunde erstellen | `/kunden-anlegen [Name]` |
| `/mitarbeiter-anlegen` | MA erstellen | `/mitarbeiter-anlegen [Name]` |
| `/neuer-termin` | Termin erstellen | `/neuer-termin [Details]` |

## Spezialisierte Agents

| Agent | Bereich | Wann aktivieren |
|-------|---------|-----------------|
| `eah-dienstplan` | Kalender, Termine, DnD, Labels, Absagen | Schedule-Bugs, neue Features |
| `eah-abrechnung` | Budget, Billing, LN, Rechnungen, Steuern | Abrechnungs-Logik, Budget-Fixes |
| `eah-rollen` | Permissions, RLS, Route Guards, Sidebar | Rollen-Refactor, Zugriffsfehler |
