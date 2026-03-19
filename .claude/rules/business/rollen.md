# Rollen-Regeln – Alltagshilfe Fischer

## 4 Rollen (Zielzustand)

| Rolle | Sichtbar | Bearbeiten | Loeschen |
|-------|----------|------------|----------|
| globaladmin | Alles | Alles | Alles |
| geschaeftsfuehrer | Alles am Standort | Alles am Standort | Ja (außer System) |
| buchhaltung | Alles (read-only) | Budget, Abrechnung, Rechnungen | Nein |
| mitarbeiter | Nur eigene Termine | Eigene Zeiten (mit Freigabe) | Nein |

## MIGRATION: admin-Rolle wird entfernt

`admin` (Disponent) Rechte werden in `geschaeftsfuehrer` zusammengefuehrt.
PostgreSQL ENUM-Werte koennen NICHT entfernt werden — `admin` bleibt im Enum,
wird aber nirgends mehr vergeben oder geprueft.

## Prüfmuster

```typescript
// NACH Refactor:
const { isGlobalAdmin, isGeschaeftsfuehrer, isBuchhaltung } = useUserRole();

// Admin-Level (GF + GlobalAdmin):
if (!isGeschaeftsfuehrer) return <AccessDenied />;

// Buchhaltung darf lesen + Budget bearbeiten:
if (!isGeschaeftsfuehrer && !isBuchhaltung) return <AccessDenied />;

// Nur GlobalAdmin:
if (!isGlobalAdmin) return <AccessDenied />;
```

## Sidebar-Sichtbarkeit

```
Dashboard:           alle
Mein Bereich:        geschaeftsfuehrer, mitarbeiter
Dienstplan:          globaladmin, geschaeftsfuehrer
Kunden:              globaladmin, geschaeftsfuehrer, buchhaltung (read-only)
User-Management:     globaladmin, geschaeftsfuehrer
Dokumentenverwaltung: globaladmin, geschaeftsfuehrer, buchhaltung (read-only)
Leistungsnachweise:  globaladmin, geschaeftsfuehrer, buchhaltung
Budgettracker:       globaladmin, geschaeftsfuehrer, buchhaltung
Berichte:            globaladmin, geschaeftsfuehrer, buchhaltung
Aktivitaetslog:      globaladmin
Einstellungen:       globaladmin, geschaeftsfuehrer
```
