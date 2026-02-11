

# RBAC-Architektur anpassen: Rollensystem modernisieren

## Ist-Zustand (Was bereits existiert)

Das System hat bereits eine solide Basis:
- **`app_role` Enum**: `geschaeftsfuehrer`, `admin`, `mitarbeiter`
- **`user_roles` Tabelle** mit RLS-Policies und Audit-Logging
- **Security-Definer-Funktionen**: `has_role()`, `is_admin_or_higher()`, `is_geschaeftsfuehrer()`, `can_delete()`
- **`benutzer` Tabelle** fuer Benutzerprofile (getrennt von auth.users)
- **`useUserRole` Hook** im Frontend
- **Supabase Auth** fuer JWT-basierte Authentifizierung (kein eigenes Passwort-Hashing noetig)

## Mapping: Neues Prompt vs. bestehende Rollen

| Prompt-Rolle | Bestehende Rolle | Aenderung |
|---|---|---|
| StandortSuperadmin | `geschaeftsfuehrer` | Umbenennung im UI, DB-Wert bleibt |
| Disponent | `admin` | Umbenennung im UI zu "Disponent" (statt "Manager") |
| Mitarbeiter | `mitarbeiter` | Bleibt gleich |
| Buchhaltung | -- | Neuer Enum-Wert `buchhaltung` |

## Was NICHT geaendert wird (bereits korrekt)

- Supabase Auth bleibt bestehen (kein eigenes JWT/bcrypt noetig)
- `user_roles` Tabelle bleibt (bereits korrekt aufgebaut)
- Keine `users`-Tabelle mit `password_hash` (Supabase Auth uebernimmt das)
- Kein Rate-Limiting auf Login (Supabase Auth macht das automatisch)
- Keine eigenen API-Endpoints (wir nutzen Supabase RLS + Edge Functions)

---

## Schritt 1: Datenbank-Migration

### 1a. Enum erweitern
- `app_role` Enum um `buchhaltung` erweitern

### 1b. Permissions-Tabellen vorbereiten (optional, fuer Zukunft)
- Tabelle `permissions` erstellen: `id`, `name` (unique), `beschreibung`
- Tabelle `role_permissions` erstellen: `role` (app_role), `permission_id` (FK), Primary Key auf Kombination
- Initial-Seed mit Berechtigungen wie:
  - `users.create`, `users.deactivate`, `users.assign_roles`
  - `einsaetze.planen`, `einsaetze.lesen`
  - `kunden.verwalten`, `kunden.lesen`
  - `mitarbeiter.lesen`
  - `reports.lesen`
  - `einstellungen.aendern`
  - `rechnungen.lesen`, `rechnungen.verwalten`
  - `zeiterfassung.eigen`
  - `dokumentation.eigen`

### 1c. Security-Definer-Funktionen erweitern
- `has_permission(_user_id uuid, _permission text)` erstellen: prueft ob einer der Rollen des Users die gewuenschte Permission hat
- Bestehende Funktionen (`is_admin_or_higher`, etc.) bleiben fuer Rueckwaertskompatibilitaet

---

## Schritt 2: useUserRole Hook erweitern

- `buchhaltung` Rolle in die Hierarchie einbauen (zwischen mitarbeiter und admin)
- Neue Helper: `isDisponent`, `isBuchhaltung`
- `getRoleLabel` aktualisieren:
  - `geschaeftsfuehrer` -> "StandortSuperadmin"
  - `admin` -> "Disponent"
  - `mitarbeiter` -> "Mitarbeiter"
  - `buchhaltung` -> "Buchhaltung"
- Optional: `hasPermission()` Funktion die gegen die `role_permissions` Tabelle prueft

---

## Schritt 3: Sidebar dynamisch machen

Statt hardcoded `role === 'mitarbeiter'` Check wird die Sidebar rollenbasiert aufgebaut:

```text
StandortSuperadmin: Dashboard, Dienstplan, Kunden, Mitarbeiter, Dokumente, Leistungen, Einstellungen
Disponent:          Dashboard, Dienstplan, Kunden (lesen), Mitarbeiter (lesen)
Mitarbeiter:        Dashboard (eigene Termine)
Buchhaltung:        Dashboard, Leistungen & Abrechnungen
```

Die Sidebar-Items werden mit einer `requiredRoles`-Liste versehen und dynamisch gefiltert.

---

## Schritt 4: Benutzerverwaltung anpassen

- `roleLabelMap` aktualisieren mit neuen Labels
- Rollen-Dropdown erweitern um `buchhaltung`
- Berechtigungen fuer Rollenvergabe:
  - Nur `geschaeftsfuehrer` (StandortSuperadmin) kann Rollen vergeben
  - Nur `geschaeftsfuehrer` kann User deaktivieren/loeschen
  - Disponent hat KEINEN Zugriff auf Benutzerverwaltung

---

## Schritt 5: Dashboard-Routing anpassen

- `Dashboard.tsx`: Buchhaltung bekommt eigene Route mit eingeschraenkter Ansicht
- Disponent bekommt Zugriff auf Dienstplan und Kunden/Mitarbeiter (nur lesen)

---

## Schritt 6: RLS-Policies erweitern

- Bestehende Policies nutzen bereits `is_admin_or_higher()` - diese Funktion muss entscheiden ob `buchhaltung` ebenfalls Admin-Level hat (nein, nur fuer Rechnungen)
- Neue Policy fuer `rechnungen` und `rechnungspositionen`: Buchhaltung darf lesen und Status verwalten
- `abrechnungsregeln`: Buchhaltung darf lesen

---

## Technische Details

### Dateien die geaendert werden:
1. **Migration SQL** - Enum erweitern, Permissions-Tabellen, Security-Definer
2. `src/hooks/useUserRole.tsx` - Neue Rollen, Labels, Helper
3. `src/components/dashboard/AppSidebar.tsx` - Dynamische Navigation
4. `src/pages/Dashboard.tsx` - Routing fuer Buchhaltung/Disponent
5. `src/pages/controlboard/BenutzerverwaltungNeu.tsx` - Labels, Dropdown
6. Ggf. `src/pages/MitarbeiterStart.tsx` - Umbenennung

### Was NICHT angefasst wird:
- `src/integrations/supabase/client.ts` (auto-generiert)
- `src/integrations/supabase/types.ts` (auto-generiert)
- `.env` (auto-generiert)
- Edge Functions (bleiben kompatibel)
- Bestehende RLS-Policies (bleiben durch Rueckwaertskompatibilitaet der Helper-Funktionen erhalten)

