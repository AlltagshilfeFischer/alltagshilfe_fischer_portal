---
name: abrechnung
description: Budget- und Abrechnungslogik der Alltagshilfe Fischer. Laden wenn Abrechnung, Budget, Leistungsnachweis, Rechnung, Entlastungsbetrag, Verhinderungspflege, Pflegesachleistung, Steuersatz oder Budgettracker relevant sind.
user-invocable: true
argument-hint: "[Budget-Typ oder Abrechnungsfrage]"
---

# Abrechnungs- & Budgetlogik – Alltagshilfe Fischer

## Budget-Typen (§ SGB)

| Typ | Gesetz | Betrag | Logik |
|-----|--------|--------|-------|
| Entlastungsbetrag | §45b SGB XI | 131€/Monat | Monatlich, Übertrag bis 30.06. Folgejahr |
| Verhinderungspflege | §39 SGB XI | 3.539€/Jahr | Jährliches Budget |
| Umwandlung (Kombi) | §45a SGB XI | max 40% Sachleistung | Abhängig von Pflegegrad |
| Haushaltshilfe | §38 SGB V | individuell | Ärztl. Verordnung – **NOCH NICHT IMPLEMENTIERT** |
| Privatleistung | — | unbegrenzt | Direkte Rechnung an Kunden |

## DB-Tabellen

```
budget_transactions  → Verbrauch-Tracking (APLANO_IMPORT | MANUAL)
care_levels          → Pflegegrad-Budgets (sachleistung_monat, kombi_max_40_prozent_monat)
tariffs              → Stundensätze (ENTLASTUNG, KOMBI, VERHINDERUNG)
abrechnungsregeln    → Kundenspezifische Regeln (kostentraeger_typ + leistungsart)
rechnungen           → Generierte Rechnungen (Status-Workflow: entwurf → freigegeben → versendet → bezahlt)
abrechnungs_historie → Statusänderungs-Log
leistungen           → Anträge pro Kunde (beantragt → genehmigt → aktiv)
```

## Priorisierung der Budgettöpfe

Pro Kunde konfigurierbar über `kunden.budget_prioritaet` (String-Array):
```typescript
// Beispiel: Erst Entlastung, dann VP, dann Kombi, dann Privat
budget_prioritaet: ['entlastung', 'verhinderung', 'kombi', 'privat']
```

## Abrechnungs-Prüfungskette (Spec §12)

```
1. Status-Check    → Termin hat Status 'completed' oder 'abgesagt_rechtzeitig'
2. Budget-Check    → Gewählter Topf hat Restguthaben
3. Dokumenten-Check → Anträge vorhanden (leistungen.status = 'genehmigt')
4. Regelprüfung    → Kundenspezifische Regeln anwenden
5. Split           → Bei Restbudget < Einsatzkosten: aufteilen
```

### Restbetrags-Split Beispiel
```
Einsatz: 39€, Budget §45b: nur 20€ Rest
→ 20€ über §45b + 19€ Privat (oder nächster Topf laut Priorisierung)
```

## Steuerlogik

```
0%  → Pflegeleistung (§4 Nr. 16 UStG) – Kunden MIT Pflegegrad
19% → Privatleistung bei Kunden OHNE Pflegegrad
```

## Domain Types

```typescript
import { BudgetAvailability, BillingSuggestion, AbrechnungsRow } from '@/types/domain';

// Budget-Verfügbarkeit berechnen
interface BudgetAvailability {
  entlastungYearlyTotal: number;   // Gesamtbudget Entlastung (Jahr)
  entlastungConsumed: number;      // Verbraucht
  entlastungAvailable: number;     // Verfügbar
  kombiMonthlyMax: number;         // Kombi-Limit (40% Sachleistung)
  vpYearlyTotal: number;           // Verhinderungspflege Jahresbudget
  vpRemainingYear: number;         // VP Rest
  expiringCarryOver: number;       // Verfallender Übertrag (30.06.)
}
```

## Hooks & Seiten

- `src/hooks/useBudgetTransactions.ts` – Budget-Queries + Mutations
- `src/hooks/useTariffs.ts` – Stundensätze
- `src/hooks/useCareLevels.ts` – Pflegegrad-Budgets
- `src/pages/controlboard/budgettracker/BudgetTracker.tsx` – Übersicht aller Kunden
- `src/pages/controlboard/budgettracker/BudgetTrackerDetail.tsx` – Detail pro Kunde
- `src/pages/controlboard/Leistungsnachweise.tsx` – Leistungsnachweis-Generierung

## Edge Functions

- `batch-billing` – Monatliche Sammelabrechnung
- `auto-complete-appointments` – Auto-Status-Update für vergangene Termine

## Leistungsnachweis-Flow

```
1. Termine des Vormonats für Kunde laden (status: completed, abgesagt_rechtzeitig)
2. Budget-Priorisierung anwenden → Beträge zuordnen
3. Leistungsnachweis generieren (Preview + PDF)
4. Kunde unterschreibt mobil (LeistungsnachweisSignature)
5. GF-Unterschrift nachtragen
6. Export an AS Abrechnung
```

## GAPS (noch zu implementieren)

- [ ] §38 SGB V Haushaltshilfe als Budget-Typ
- [ ] Steuersatz-Feld in Rechnungen (0% vs 19%)
- [ ] Restbetrags-Split vollständig testen
- [ ] Dokumenten-Check blockiert Export wenn Nachweis fehlt
- [ ] Reminder für fehlende Unterschriften
- [ ] GF-Dashboard-Widget für offene Leistungsnachweise
