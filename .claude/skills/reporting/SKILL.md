---
name: reporting
description: Reporting und Controlling der Alltagshilfe Fischer. Laden wenn Auswertungen, Statistiken, CSV/PDF-Export, Kennzahlen, Auslastung oder Berichte relevant sind.
user-invocable: false
---

# Reporting & Controlling – Alltagshilfe Fischer

## Status: ~45% implementiert

### Was existiert

| Datei | Was | Status |
|-------|-----|--------|
| `src/pages/controlboard/Reporting.tsx` (523 Zeilen) | Termin-Auswertungen | Funktional |
| `src/hooks/useReportingData.ts` | Report-Queries | Funktional |
| BudgetTracker | Budget-Übersicht pro Kunde | Funktional (95%) |
| Leistungsnachweise | Monatsübersicht + Unterschriften | Funktional (85%) |

### Vorhandene Reports

- Termin-Statistiken (Anzahl, Dauer, Status-Breakdown)
- MA-Workload (Termine pro MA)
- Kunden-Aktivität (Termine pro Kunde)
- Status-Verteilung (Charts via recharts)
- CSV-Export (PapaParse)
- Multi-Filter (Zeitraum, Kunde, MA, Status)

### Fehlende Reports (Spec M-08, M-14, §4.5)

1. **Budget/Billing-Report** — Umsatz nach Kostenträger, Kunde, Zeitraum
2. **Invoice-Report** — Rechnungs-Übersicht, offene Posten
3. **LN-Report** — Unterschriften-Status, Completion-Metriken
4. **Kontingent-Verbrauch** — Budget-Auslastung pro Kunde/Topf
5. **Steuer-Split** — 0% vs 19% Aufschlüsselung
6. **Geplant vs. Durchgeführt** — Vergleich mit Abweichungen
7. **Ein-/Austrittsstatistik** — Kunden-Fluktuation
8. **Personalplanung** — Soll vs. Ist Stunden pro MA
9. **PDF-Export** — Fehlt komplett (nur CSV vorhanden)

## Technologie

- **Charts:** recharts (installiert)
- **CSV:** PapaParse (installiert)
- **PDF:** Noch zu wählen (z.B. @react-pdf/renderer oder jsPDF)

## Kerndateien

```
src/pages/controlboard/Reporting.tsx     # Hauptseite
src/hooks/useReportingData.ts            # Queries
src/pages/controlboard/budgettracker/    # Budget-Reports (separat)
```

## CANCELLED_STATUSES (für Report-Filter)

```typescript
// aus useReportingData.ts
const CANCELLED_STATUSES = ['cancelled', 'abgesagt_rechtzeitig'];
```
