# Dienstplan-Regeln – Alltagshilfe Fischer

## Goldene Regel

**Bestehende Termine NIEMALS ueberschreiben — nur fehlende hinzufuegen!**
`ist_ausnahme = true` → NICHT in Regenerierung einbeziehen.

## Termin-Status Workflow

```
unassigned → scheduled → in_progress → completed → abgerechnet → bezahlt
                      ↘ cancelled (kurzfristige Absage, abrechenbar)
                      ↘ abgesagt_rechtzeitig (>= 2 Tage vorher, NICHT abrechenbar)
                      ↘ nicht_angetroffen
```

## Absage-Logik (2-Tage-Regel)

```
Wenn (termin.start_at - absage_datum) < 2 Tage:
  → Status: cancelled (kurzfristig, abrechenbar)
Wenn (termin.start_at - absage_datum) >= 2 Tage:
  → Status: abgesagt_rechtzeitig (nicht abrechenbar)
```

## Pausen

- 15 Minuten Mindestpause zwischen Terminen desselben MA
- Ausnahmen moeglich, aber mit Warnung (nicht blockieren)

## Zeitzone

Immer `Europe/Berlin`. Alle DB-Werte als `TIMESTAMPTZ` (UTC).

## Serien (Regeltermine)

- Template in `termin_vorlagen` → generierte Eintraege in `termine`
- Einzeltermin: `vorlage_id = NULL`
- Maximum: 12 Monate Vorlauf
- Bei Aenderung einer Instanz: `ist_ausnahme = true` setzen, `vorlage_id` beibehalten
