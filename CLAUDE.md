# Easy Assist Hub – Claude Code Instructions

## Projektübersicht

**Alltagshilfe Fischer GbR** – Care-Management-System für ambulante Alltagshilfe.
Verwaltet Mitarbeiter, Kunden, Termine, Abrechnung & Budgetlogik, Leistungsnachweise.

- **Standorte:** Hannover, Hildesheim, Peine
- **Benutzerrollen:** `globaladmin`, `geschaeftsfuehrer`, `admin` (Disponent), `mitarbeiter`, `buchhaltung`
- **Sprache UI:** Deutsch | **Sprache Code:** Englisch
- **Auftraggeber:** Alltagshilfe Fischer GbR (Florian Fischer, Luca Grützner)
- **Abnahme-Deadline:** 31.03.2026

---

## Spezifikation (Kurzfassung)

### Kernmodule & Status

| Modul | Status | Kritische Gaps |
|-------|--------|---------------|
| Auth & Benutzerverwaltung | ~95% | "Merken"-Checkbox fehlt |
| Kundenverwaltung (CRUD, Import) | ~85% | Vertrags-/Antrags-PDFs fehlen |
| Mitarbeiterverwaltung (CRUD, Import) | ~85% | Standort-ENUM nur "Hannover" |
| Dienstplan/Kalender | ~65% | Label-System, Absage-Logik, Termin-Kopie fehlen |
| Mitarbeiter-Frontend | ~90% | Push-Notifications fehlen |
| Leistungsnachweise & Unterschriften | ~60% | Reminder-System, GF-Stempel fehlen |
| Budget- & Abrechnungslogik | ~65% | §38 SGB V, Steuersätze, Restbetrags-Split verifizieren |
| Reporting & Controlling | ~20% | Zentrales Reporting-Modul fehlt komplett |
| Benachrichtigungen | ~15% | E-Mail-Trigger, Reminder fehlen |

### Rollen & Rechte (Spec §9.1)
```
globaladmin      → Alle Standorte, alles
geschaeftsfuehrer → Ein Standort, volle Planungs-/Änderungsrechte
admin (Disponent) → Termine CRUD, MA zuweisen, KEIN endgültiges Löschen
mitarbeiter      → Nur eigener Kalender, Zeiten anpassen (mit Freigabe)
buchhaltung      → Budget/Abrechnung, read-only auf Stammdaten
```

### Abrechnungs-Budget-Typen (Spec §8.1)
```
§45b Entlastungsbetrag   → 131€/Monat, Übertrag bis 30.06. Folgejahr
§39  Verhinderungspflege  → 3.539€/Jahr
§45a Umwandlungsanspruch  → max 40% Sachleistung
§38  Haushaltshilfe       → ärztl. Verordnung (NOCH NICHT IMPLEMENTIERT)
     Privatleistung       → unbegrenzt
```

### Termin-Labels (Spec §9.5 – NOCH NICHT IMPLEMENTIERT)
```
Standard (Kundentermin), Erstgespräch, Meeting, Schulung,
Bewerbungsgespräch, Blocker, Absage Kunde (kurzfristig → abrechenbar),
Absage Kunde (rechtzeitig → nicht abrechenbar), Ausfall MA/Firma
```

### Abrechnungs-Prüfungskette (Spec §12)
```
1. Status-Check: Termin = "durchgeführt"?
2. Budget-Check: Topf hat Guthaben?
3. Dokumenten-Check: Anträge/Nachweise vorhanden?
4. Regelprüfung: Kundenspezifische Abrechnungsregel anwenden
5. Split bei Restbudget (z.B. 20€ Kasse + 19€ Privat)
```

### Steuerlogik (Spec §12.1)
```
0%  → Pflegeleistung (§4 Nr. 16 UStG)
19% → Privatleistung ohne Pflegegrad
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

### Supabase Edge Functions lokal testen
```bash
supabase functions serve <function-name> --env-file .env.local
```

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite 5 (Port 8080, SWC compiler) |
| UI | shadcn/ui (Radix UI) + Tailwind CSS 3 |
| Routing | React Router v6 (client-side, **kein Next.js**) |
| State | TanStack React Query v5 + Context API |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | OpenAI GPT-4o-mini via Supabase Edge Functions |
| Email | Resend API (Fallback: Supabase Auth) |
| DnD | @dnd-kit (Scheduling-Kalender) |
| Dates | date-fns v4 (German locale) |
| Charts | recharts (Budget-Visualisierung) |
| CSV | papaparse (Kunden/Mitarbeiter-Import) |

**Path Alias:** `@` → `src/` (konfiguriert in `vite.config.ts` und `tsconfig.json`)

**Supabase Env-Vars:** `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` (VITE_-Prefix erforderlich für Client-Zugriff)

---

## Architektur

### Provider-Wrapping (Reihenfolge kritisch)
```
AuthProvider → ForcePasswordChange → QueryClientProvider → BrowserRouter → Routes
```
`ForcePasswordChange` erzwingt Passwort-Änderung bei Erstanmeldung, bevor der Rest der App zugänglich ist.

### Routing (React Router v6)
```
/                              → Index (Login/Auth)
/dashboard                     → DashboardHome
/dashboard/mein-bereich        → MitarbeiterDashboard (nur Mitarbeiter)
/dashboard/controlboard/
  schedule-builder             → ScheduleBuilderModern (admin+)
  master-data                  → MasterData (admin+)
  admin                        → BenutzerverwaltungNeu (GF/GlobalAdmin)
  dokumentenverwaltung         → Dokumentenverwaltung (admin+)
  leistungsnachweise           → Leistungsnachweise (admin+)
  budgettracker                → BudgetTracker (admin+, buchhaltung)
  budgettracker/:kundenId      → BudgetTrackerDetail
  aktivitaetslog               → AktivitaetsLog (GlobalAdmin)
/dashboard/settings            → Settings
/chat                          → ChatPage (AI-Assistent)
```

Rollenprüfung erfolgt in `Dashboard.tsx`. Sidebar-Sichtbarkeit wird über `requiredRoles` in `AppSidebar.tsx` gesteuert.

### Rollen-Hierarchie
```
globaladmin > geschaeftsfuehrer > admin (disponent) > mitarbeiter
                                                    > buchhaltung
```

### Auth-System
- Supabase Auth mit Email/Password
- `useAuth()` – AuthContext mit Session-Persistence, Token-Refresh, Audit-Logging
- `useUserRole()` – Rollenabfrage aus `benutzer`-Tabelle, Permissions-Check
- Jede Auth-Aktion (LOGIN, LOGOUT, PASSWORD_CHANGE) wird in `audit_log` protokolliert

### Data Layer
- **Supabase Client:** `src/integrations/supabase/client.ts` – Singleton mit localStorage-Persistence
- **Generierte Typen:** `src/integrations/supabase/types.ts` – IMMER für DB-Queries nutzen
- **Domain Types:** `src/types/domain.ts` – Business-Interfaces (Employee, Customer, Appointment, Budget)
- **React Query Hooks:** `src/hooks/` – Alle DB-Zugriffe über Custom Hooks mit `useQuery`/`useMutation`

---

## Wichtige Datei-Pfade

```
src/
├── App.tsx                              # Root: Provider-Setup + Route-Definitionen
├── integrations/supabase/
│   ├── client.ts                        # Supabase-Client Singleton
│   └── types.ts                         # Generierte DB-Typen – IMMER nutzen
├── hooks/
│   ├── useAuth.tsx                      # Auth Context + Session Management
│   ├── useUserRole.tsx                  # Rollen & Permissions
│   ├── useAppointments.ts              # Termin-Queries (mit Joins)
│   ├── useCustomers.ts                 # Kunden-Queries
│   ├── useEmployees.ts                 # Mitarbeiter-Queries
│   ├── useCustomerMutations.ts         # Kunden CRUD
│   └── useBudgetTransactions.ts        # Budget/Billing Queries + Mutations
├── types/domain.ts                      # Business Domain Types
├── components/
│   ├── ui/                              # shadcn/ui Komponenten (50+)
│   ├── dashboard/                       # Layout, Sidebar, Header, QuickActionChat
│   ├── schedule/                        # Kalender-System (calendar/, dialogs/, panels/, ai/)
│   ├── customers/                       # Kunden-Wizard, Import/Export, Edit
│   ├── mitarbeiter/                     # Mitarbeiter-Features (Abwesenheit, Signatur, Dokumente)
│   ├── auth/                            # Login, Registration, Password-Reset
│   └── leistungsnachweis/               # Leistungsnachweis-Preview
└── pages/controlboard/
    ├── ScheduleBuilderModern.tsx        # Haupt-Kalenderansicht
    ├── MasterData.tsx                   # Kundenverwaltung
    ├── BenutzerverwaltungNeu.tsx        # User-Management
    ├── Leistungsnachweise.tsx           # Leistungsnachweis-Verwaltung
    ├── Dokumentenverwaltung.tsx         # Dokumenten-Upload
    └── budgettracker/                   # Budget-Übersicht + Detail

supabase/functions/
├── _shared/                             # Shared utilities (CORS, OpenAI, errors)
├── parse-appointment-text/              # AI: Text → Termin
├── parse-kunden-text/                   # AI: Text → Kunden
├── parse-mitarbeiter-text/              # AI: Text → Mitarbeiter
├── suggest-employees/                   # AI: Mitarbeiter-Matching
├── dashboard-assistant/                 # AI: Chat-Assistent (SSE streaming)
├── batch-billing/                       # Sammelabrechnung
├── auto-complete-appointments/          # Auto-Status-Update
└── send-email/                          # E-Mail via Resend API
```

---

## Datenbankarchitektur

### Termin-System (KRITISCH)
Zwei Typen:
- **Einzeltermine**: `vorlage_id = NULL` in `termine`
- **Regeltermine**: Template in `termin_vorlagen` → generiert Einträge in `termine`

**Goldene Regel:** Bestehende Termine NIEMALS überschreiben – nur fehlende hinzufügen!

```
ist_ausnahme = true  → manuell geänderte Serieninstanz → NICHT überschreiben
ist_ausnahme = false → normaler Serientermin
vorlage_id = NULL    → Einzeltermin
```

### Kern-Tabellen
- `termine` – Einzeltermine (Status: unassigned, scheduled, in_progress, completed, cancelled, abgerechnet, bezahlt, nicht_angetroffen, abgesagt_rechtzeitig)
- `termin_vorlagen` – Wiederkehrende Vorlagen (wochentag, start_zeit, dauer_minuten, intervall)
- `mitarbeiter` – Profile (Kalenderfarbe, Workload, Qualifikation, Standort)
- `kunden` – Profile (Pflegegrad, Versicherung, Budget-Felder, Abrechnungsregeln)
- `benutzer` – Auth-verknüpfte User-Accounts (mit app_role Enum)
- `audit_log` – Sicherheits-Audit-Trail
- `budget_transactions` – Budget-Verbrauch (APLANO_IMPORT, MANUAL)
- `care_levels` – Pflegegrad-Budgets (PG0-5, monatliche Limits)
- `tariffs` – Stundensätze pro Leistungsart
- `abrechnungsregeln` – Kundenspezifische Abrechnungslogik
- `rechnungen` – Generierte Rechnungen mit Status-Workflow
- `leistungen` – Anträge (Entlastung, VP, Kombi) mit Genehmigungs-Status
- `dokumente` – Datei-Uploads (kunden_id ODER mitarbeiter_id)
- `termin_aenderungen` – Änderungsanfragen mit Approval-Workflow
- `mitarbeiter_abwesenheiten` – Urlaub/Krankheit (TSTZRANGE)
- `mitarbeiter_verfuegbarkeit` – Wöchentliche Verfügbarkeit
- `kunden_zeitfenster` – Kundenpräferenzen für Termine

### Wichtige DB-Enums
```
termin_status:     unassigned | scheduled | in_progress | completed | cancelled | abgerechnet | bezahlt | nicht_angetroffen | abgesagt_rechtzeitig
app_role:          globaladmin | geschaeftsfuehrer | admin | mitarbeiter | buchhaltung
leistungsart:      entlastungsleistung | verhinderungspflege | kurzzeitpflege | pflegesachleistung | privat | sonstige
kostentraeger_typ: pflegekasse | krankenkasse | kommune | privat | beihilfe
rechnung_status:   entwurf | freigegeben | versendet | bezahlt | storniert
leistungs_status:  beantragt | genehmigt | aktiv | pausiert | beendet
```

---

## Code-Konventionen

### TypeScript
- **Kein `any`** – immer konkrete Typen aus `src/integrations/supabase/types.ts` oder `src/types/domain.ts`
- Interfaces über Type-Aliases für Objekte bevorzugen
- Supabase-generierte Typen mit `Database['public']['Tables']['tabelle']['Row']` nutzen

### React
- Business-Logik in Custom Hooks auslagern, nicht in Render-Funktionen
- Verwandte States als Reducer oder Objekt gruppieren (nicht 15+ einzelne `useState`)
- `useMemo`/`useCallback` bei teuren Berechnungen (Filter, Sortierung)
- Komponenten max. ~150 Zeilen – sonst aufteilen

### Error Handling
- **Nie silent swallow:** kein `catch (_) {}` oder leerer Catch-Block
- User-Feedback: immer `toast()` aus `sonner`
- Supabase: immer `const { data, error } = await supabase...` dann `if (error) throw error`

### Supabase Edge Functions
- **Shared Utilities** in `supabase/functions/_shared/utils.ts` nutzen (CORS, OpenAI, Error-Responses)
- Input immer validieren bevor Processing
- Keine internen Error-Messages direkt an den Client zurückgeben

### UI
- Ausschließlich shadcn/ui-Komponenten – keine eigenen UI-Primitives
- Tailwind CSS für Styling – keine inline `style={{}}`
- Icons: nur `lucide-react`
- Toasts: `sonner` (nicht `use-toast` für neue Features)

---

## Verfügbare Skills

| Skill | Beschreibung | Aufruf |
|-------|-------------|--------|
| `/db-schema` | DB-Schema nachschlagen | Auto-Trigger bei DB-Queries |
| `/dienstplan` | Termin-/Kalenderlogik | Auto-Trigger bei Schedule-Arbeit |
| `/feature` | Feature-Entwicklung Checkliste | `/feature [Beschreibung]` |
| `/review` | Code-Review Checkliste | `/review [Datei]` |
| `/commit` | Git-Commit Konventionen | `/commit` |
| `/migration` | Supabase-Migration erstellen | `/migration [Beschreibung]` |
| `/kunden-anlegen` | Kunde erstellen | `/kunden-anlegen [Name]` |
| `/mitarbeiter-anlegen` | Mitarbeiter erstellen | `/mitarbeiter-anlegen [Name]` |
| `/neuer-termin` | Termin korrekt erstellen | `/neuer-termin [Details]` |
| `/abrechnung` | Abrechnungs-/Budget-Logik | Auto-Trigger bei Budget-Arbeit |
| `/reporting` | Reporting-Funktionen | Auto-Trigger bei Auswertungen |
