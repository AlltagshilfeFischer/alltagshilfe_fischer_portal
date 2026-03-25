# Testing Guide — Easy Assist Hub (Alltagshilfe Fischer)

## Voraussetzungen

- **Framework:** React 18 + Vite (KEIN Next.js, KEIN SSR)
- **Routing:** React Router v6 (Client-Side SPA)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Port:** Dev-Server laeuft auf `http://localhost:8080`
- **Sprache UI:** Deutsch (alle Labels, Buttons, Fehlermeldungen)
- **Auth:** Supabase Auth (E-Mail + Passwort)

## Login & Authentifizierung

### Login-Seite
- URL: `/` (Root)
- Felder: E-Mail, Passwort
- Erfolg: Redirect zu `/dashboard`
- Fehler: Toast-Meldung "Ungueltige Anmeldedaten" oder aehnlich

### Rollen-System (4 Rollen)
| Rolle | Zugriff |
|-------|---------|
| `globaladmin` | Alles (alle Seiten, alle Aktionen) |
| `geschaeftsfuehrer` | Alles am Standort (wie globaladmin, minus Aktivitaetslog) |
| `buchhaltung` | Read-only + Budget/Abrechnung bearbeiten, kein Dienstplan-Edit, kein User-Management |
| `mitarbeiter` | Nur eigene Termine (`/dashboard/mein-bereich`), keine Controlboard-Seiten |

### Erwartetes Verhalten bei fehlender Rolle
- Kein Crash, sondern Hinweis: "Ihrem Konto wurde noch keine Rolle zugewiesen"
- Abmelde-Button ist sichtbar

## Seiten & Routen

### Oeffentliche Routen
| Route | Seite | Erwartung |
|-------|-------|-----------|
| `/` | Login | Login-Formular sichtbar |
| Beliebige unbekannte Route | 404 | "Seite nicht gefunden" Meldung |

### Dashboard-Routen (authentifiziert)
| Route | Seite | Rollen | Erwartung |
|-------|-------|--------|-----------|
| `/dashboard` | Dashboard Home | alle | 4 Statistik-Karten (Skeleton waehrend Laden) |
| `/dashboard/mein-bereich` | Mitarbeiter-Bereich | gf, mitarbeiter | Eigene Termine/Stunden |
| `/dashboard/controlboard/schedule-builder` | Dienstplan | gf, globaladmin | Wochenkalender mit Terminen |
| `/dashboard/controlboard/master-data` | Kundenverwaltung | gf, globaladmin, buchhaltung | Kundenliste (oder "Keine Kunden") |
| `/dashboard/controlboard/admin` | Benutzerverwaltung | gf, globaladmin | Benutzerliste |
| `/dashboard/controlboard/dokumentenverwaltung` | Dokumente | gf, globaladmin, buchhaltung | Dokument-Upload/Liste |
| `/dashboard/controlboard/leistungsnachweise` | Leistungsnachweise | gf, globaladmin, buchhaltung | Monatliche Nachweise (oder "Keine Nachweise gefunden") |
| `/dashboard/controlboard/budgettracker` | Budget-Tracker | gf, globaladmin, buchhaltung | Budget-Uebersicht |
| `/dashboard/controlboard/reporting` | Berichte | gf, globaladmin, buchhaltung | Auswertungen |
| `/dashboard/controlboard/aktivitaetslog` | Aktivitaetslog | globaladmin | System-Logs |
| `/dashboard/settings` | Einstellungen | gf, globaladmin | Konfiguration |

### Hinweis zu nicht-autorisierten Zugriffen
- **Mitarbeiter** die `/dashboard/controlboard/*` aufrufen → Redirect zu `/dashboard`
- **Buchhaltung** die `/dashboard/controlboard/admin` aufruft → Redirect zu `/dashboard`
- Kein Crash, kein leerer Bildschirm — immer sauberer Redirect

## Erwartete UI-Zustaende

### Ladezustaende
Alle Seiten zeigen waehrend des Ladens einen visuellen Indikator:
- **Dashboard Home:** Skeleton-Platzhalter in den Statistik-Karten
- **Dienstplan:** Spinner ("Lade Dienstplan...")
- **Kundenverwaltung:** "Lade Kundendaten..." Text
- **Leistungsnachweise:** Spinner (Loader2 Icon)
- **Benutzerverwaltung:** Ladezustand

### Leere Zustaende
Wenn keine Daten vorhanden sind:
- **Kundenverwaltung:** "Keine Kunden gefunden" Hinweis
- **Leistungsnachweise:** "Keine Nachweise gefunden" + Kontext ("Passe deine Filter an" oder "Fuer diesen Monat gibt es noch keine Termine")
- **Dienstplan:** Leerer Kalender ohne Fehler
- **Keine leere Seite ohne Erklaerung**

### Fehlerzustaende
Bei Netzwerk-/Datenbankfehlern:
- Toast-Benachrichtigung (rot, unten rechts) mit Fehlerbeschreibung
- Seite crasht NICHT — Fallback-UI bleibt sichtbar
- Console.error fuer Debugging

## Dienstplan (Schedule Builder)

### Ansichten
- **Wochenansicht** (Standard): Montag–Sonntag Kalender
- **Monatsansicht:** Monatsuebersicht
- Navigation: Vor/Zurueck/Heute Buttons

### Termine
- Farbig nach Kunde oder Mitarbeiter
- Drag & Drop zum Verschieben (per @dnd-kit)
- Klick oeffnet Detail-Dialog
- Status: `scheduled`, `completed`, `cancelled`, `abgesagt_rechtzeitig`

### Termin erstellen
- Klick auf leere Kalender-Zelle → Dialog oeffnet
- Pflichtfelder: Kunde, Startzeit, Dauer
- Optionale Felder: Mitarbeiter, Notizen, Kategorie

### Konflikte
- Ueberlappende Termine werden visuell markiert
- Konflikt-Warnung erscheint beim Speichern

## Budget & Abrechnung

### Budget-Topf Priorisierung
Standard-Reihenfolge (pro Kunde ueberschreibbar):
1. Kombileistung (§45a)
2. Vorjahresrest Entlastung (FIFO, verfaellt 01.07.)
3. Verhinderungspflege (§39, 3.539 EUR/Jahr)
4. Entlastungsbetrag (§45b, 131 EUR/Monat)
5. Privat (Fallback)

### Steuerlogik
- Pflegegrad > 0 → 0% MwSt
- Pflegegrad = 0 UND Leistungsart "privat" → 19% MwSt

### Abrechenbare Termine
- `completed` → JA
- `cancelled` (kurzfristig abgesagt, < 2 Tage vorher) → JA
- `abgesagt_rechtzeitig` (>= 2 Tage vorher) → NEIN

## Bekannte Design-Entscheidungen (KEIN Bug)

Diese Verhaltensweisen sind absichtlich so implementiert:

1. **Dashboard zeigt "0" bei fehlenden Daten:** Wenn ein neuer Mandant keine Termine/Kunden hat, zeigen die Statistik-Karten "0" — das ist korrekt, nicht kaputt.

2. **Mitarbeiter sehen wenig:** Die `mitarbeiter`-Rolle hat bewusst nur Zugriff auf `/dashboard` und `/dashboard/mein-bereich`. Alle anderen Seiten sind absichtlich gesperrt.

3. **Buchhaltung kann nicht bearbeiten:** Buchhaltung hat bewusst nur Lesezugriff auf Kunden/Dokumente. Budget und Abrechnung koennen bearbeitet werden.

4. **Leere Tabellen sind normal:** Bei neuem Setup oder nach Monatsanfang koennen Leistungsnachweise, Termine und Budgets leer sein. Die App zeigt dann einen entsprechenden Hinweis.

5. **Zeitzone immer Europe/Berlin:** Alle Zeiten werden in Berliner Zeitzone angezeigt (UTC in DB, konvertiert im Frontend).

6. **Passwort-Aenderung erzwungen:** Beim ersten Login wird eine Passwort-Aenderung erzwungen — der Nutzer MUSS sein Passwort aendern, bevor er weiterarbeiten kann.

7. **Toast-Meldungen verschwinden automatisch:** Erfolgs- und Fehlermeldungen verschwinden nach wenigen Sekunden — das ist normales Verhalten.

8. **Keine Paginierung bei wenigen Eintraegen:** Listen zeigen alle Eintraege wenn < 50. Paginierung greift erst bei vielen Eintraegen.

9. **Sidebar-Items rollenabhaengig:** Nicht alle Sidebar-Eintraege sind fuer alle Rollen sichtbar — das ist absichtlich und kein UI-Bug.

## Testdaten-Hinweise

- Ohne Testdaten in Supabase sind Seiten leer — das ist erwartetes Verhalten
- Mindestens 1 Benutzer mit Rolle muss existieren fuer Login-Tests
- Termine brauchen zugewiesene Kunden und optionale Mitarbeiter
- Budget-Tests brauchen Kunden mit Pflegegrad > 0

## Technische Details

- **State Management:** TanStack React Query v5 (Server-State) + Context API (Auth)
- **Formular-Validierung:** React Hook Form + Zod Schemas
- **Icons:** Nur `lucide-react`
- **UI-Bibliothek:** shadcn/ui (Radix UI Primitives)
- **Styling:** Tailwind CSS (kein inline `style`)
- **Toast-System:** Sonner (`import { toast } from 'sonner'`)
