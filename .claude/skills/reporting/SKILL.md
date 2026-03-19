---
name: reporting
description: Reporting und Controlling der Alltagshilfe Fischer. Laden wenn Auswertungen, Statistiken, CSV/PDF-Export, Kennzahlen, Auslastung oder Berichte relevant sind.
user-invocable: true
argument-hint: "[Art der Auswertung]"
---

# Reporting & Controlling – Alltagshilfe Fischer

## Status: ~20% implementiert

Reporting ist das am wenigsten entwickelte Modul. Es gibt KEINE zentrale Reporting-Seite.

## Was existiert (verteilt)

| Wo | Was | Daten |
|----|-----|-------|
| BudgetTracker | Budget-Übersicht pro Kunde | budget_transactions, care_levels |
| ScheduleBuilderModern | Kalender-Statistiken | termine (Woche) |
| DashboardHome | Basis-Kennzahlen | Diverse Queries |
| Leistungsnachweise | Monatsübersicht | termine + kunden |

## Was fehlt (laut Spec §6.6, M-08, M-14)

### Muss-Reports

1. **Einsätze pro Mitarbeiter/Monat** (M-08)
   ```sql
   SELECT m.vorname, m.nachname,
          COUNT(*) as termine_count,
          SUM(EXTRACT(EPOCH FROM (t.end_at - t.start_at))/3600) as stunden
   FROM termine t
   JOIN mitarbeiter m ON m.id = t.mitarbeiter_id
   WHERE t.start_at >= $start AND t.start_at < $end
   GROUP BY m.id;
   ```

2. **Einsätze pro Kunde/Monat** (M-08)
   ```sql
   SELECT k.name, COUNT(*) as termine_count,
          SUM(EXTRACT(EPOCH FROM (t.end_at - t.start_at))/3600) as stunden
   FROM termine t
   JOIN kunden k ON k.id = t.kunden_id
   WHERE t.start_at >= $start AND t.start_at < $end
   GROUP BY k.id;
   ```

3. **Geplant vs. Durchgeführt vs. Nicht durchgeführt** (§4.5)
   ```sql
   SELECT status, COUNT(*)
   FROM termine
   WHERE start_at >= $start AND start_at < $end
   GROUP BY status;
   ```

4. **Export (CSV/PDF)** (M-12) – CSV über PapaParse vorhanden, PDF fehlt

### Kann-Reports (M-14)

5. **Auslastung nach Region/Standort**
6. **Entwicklung pro Leistungsart** (Trend)
7. **Umsatz- und Wachstumsprognosen**
8. **Ein-/Austrittsstatistik Kunden** (§4.1)
9. **Personalplanung** (Soll vs. Ist Stunden pro MA)

## Architektur-Empfehlung

### Neue Seite: `src/pages/controlboard/Reporting.tsx`

```
/dashboard/controlboard/reporting → Reporting (admin+, geschaeftsfuehrer, buchhaltung)
```

### Komponenten-Struktur
```
src/components/reporting/
├── ReportingPage.tsx          # Hauptseite mit Tabs
├── EinsatzReport.tsx          # Einsätze nach MA/Kunde/Zeitraum
├── BudgetReport.tsx           # Budget-Auswertungen
├── PersonalReport.tsx         # Auslastung, Soll/Ist
├── TrendChart.tsx             # Zeitverlauf-Diagramme (recharts)
├── ReportFilters.tsx          # Zeitraum, Standort, MA, Kunde
└── ExportButtons.tsx          # CSV + PDF Export
```

### Hook: `src/hooks/useReportingData.ts`
```typescript
// Parametrisierte Queries für flexible Auswertungen
function useReportingData(params: {
  startDate: string;
  endDate: string;
  standort?: string;
  mitarbeiterId?: string;
  kundenId?: string;
  groupBy: 'mitarbeiter' | 'kunde' | 'leistungsart' | 'status';
})
```

## Technologie

- **Charts:** recharts (bereits installiert)
- **CSV Export:** PapaParse (bereits installiert)
- **PDF Export:** Noch zu wählen (z.B. @react-pdf/renderer oder jsPDF)
- **Filter-State:** URL-Params oder React State
