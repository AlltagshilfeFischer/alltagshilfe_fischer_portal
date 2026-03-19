---
name: abrechnung
description: Budget- und Abrechnungslogik der Alltagshilfe Fischer. Laden wenn Abrechnung, Budget, Leistungsnachweis, Rechnung, Entlastungsbetrag, Verhinderungspflege, Pflegesachleistung, Steuersatz oder Budgettracker relevant sind.
user-invocable: false
---

# Abrechnungs- & Budgetlogik – Alltagshilfe Fischer

## Budget-Typen

| Typ | Gesetz | Betrag | Übertrag |
|-----|--------|--------|----------|
| Entlastungsbetrag | §45b SGB XI | 131€/Monat | Ja, bis 30.06. Folgejahr (FIFO) |
| Verhinderungspflege | §39 SGB XI | 3.539€/Jahr | Nein |
| Umwandlungsanspruch | §45a SGB XI | max 40% Sachleistung | Monatlich |
| Haushaltshilfe | §38 SGB V | Ärztl. Verordnung | NICHT IMPLEMENTIERT |
| Privatleistung | — | Unbegrenzt | — |

## Budget-Priorisierung (budgetCalculations.ts)

```
1. KOMBI (monatlich, verfällt Ende Monat)
2. Vorjahresrest Entlastung (FIFO, verfällt 01.07.)
3. VERHINDERUNG (höherer Stundensatz bevorzugt)
4. Reguläre Entlastung (131€/Monat)
5. PRIVAT (Fallback, unbegrenzt)
```

Konfigurierbar pro Kunde über `abrechnungsregeln` Tabelle.

## Steuerlogik

```
0%  → Pflegeleistung (§4 Nr. 16 UStG)
      Implementiert in batch-billing/index.ts Zeile 348
19% → Privatleistung ohne Pflegegrad
      ⚠️ FEHLT! Muss noch gebaut werden
```

Regel: `pflegegrad > 0` → 0% | `pflegegrad = 0 && leistungsart = 'privat'` → 19%

## Prüfungskette (Spec §12)

```
1. Status-Check:     termine.status = 'completed'?
2. Budget-Check:     Gewählter Topf hat Guthaben?
   → Falls Nein:     Split auf Privat oder Ausweichtopf
3. Dokumenten-Check: leistungen (Anträge) vorhanden + genehmigt?
4. Regelprüfung:     abrechnungsregeln für Kunde anwenden
5. Betrag berechnen: stunden × stundensatz (aus tariffs)
6. Split:            20€ Kasse + 19€ Privat bei Restbudget
```

## Batch-Billing Workflow (Edge Function)

```typescript
// supabase/functions/batch-billing/index.ts
// Input: { startDate, endDate, dry_run? }
// 1. Lade completed Termine im Zeitraum
// 2. Gruppiere nach Kunde + Kostenträger
// 3. Prüfe leistungen (Anträge) pro Kunde
// 4. Validiere Kontingente, Pflegegrad, Gültigkeit
// 5. Erstelle rechnungen + rechnungspositionen
// 6. Update termine.status → 'abgerechnet'
// 7. Schreibe abrechnungs_historie
```

## Leistungsnachweis-Flow

```
1. Auto-Generierung: termine eines Monats → leistungsnachweise Upsert
2. Status-Workflow: entwurf → veröffentlicht → unterschrieben → abgeschlossen
3. Unterschrift: Canvas-basiert, offline-fähig (localStorage)
4. PDF-Print: 2-Spalten-Tagesliste, Stunden, Billing-Checkboxen
5. Checkboxen: Kombi, Entlastung, VP, Haushaltshilfe, Deckeln §45b, Privatperson
```

## Kerndateien

```
src/lib/pflegebudget/budgetCalculations.ts    # Budget-Berechnung (KRITISCH)
src/hooks/useBudgetTransactions.ts            # Budget Queries+Mutations
src/pages/controlboard/budgettracker/         # Budget UI
src/pages/controlboard/Leistungsnachweise.tsx # LN-Verwaltung
src/components/leistungsnachweis/             # LN-Preview + Print
src/pages/controlboard/Reporting.tsx          # Auswertungen
supabase/functions/batch-billing/index.ts     # Sammelabrechnung
```

## DB-Tabellen

```
budget_transactions    → Verbrauch (client_id, service_type, hours, total_amount, billed)
care_levels            → PG0-5 Limits (sachleistung_monat, kombi_max_40_prozent_monat)
tariffs                → Stundensätze (service_type, hourly_rate, travel_flat_per_visit)
abrechnungsregeln      → Pro-Kunde Regeln (kostentraeger_typ, stundensatz, hoechstbetrag)
rechnungen             → Generierte Rechnungen (status: entwurf→freigegeben→versendet→bezahlt)
rechnungspositionen    → Zeilen pro Rechnung
leistungen             → Anträge (art, status: beantragt→genehmigt→aktiv)
leistungsnachweise     → Monats-LN (status, unterschrift_kunde, unterschrift_firma)
abrechnungs_historie   → Audit-Trail
```

## Gaps (Priorität)

1. **Tax 19%** — Privatleistung ohne Pflegegrad muss 19% bekommen
2. **Invoice-UI** — Rechnungen anzeigen/verwalten (Frontend fehlt komplett)
3. **Abrechnungsregeln-UI** — Regeln pro Kunde erstellen/bearbeiten
4. **GF-Stempel** — Stempel/Unterschrift für Leistungsnachweis
5. **Reminder** — Fehlende Unterschriften, offene Anträge
6. **§38 SGB V** — Haushaltshilfe Budget-Typ (Phase 2?)
