---
name: dienstplan
description: Arbeiten mit dem Dienstplan der Alltagshilfe Fischer. Laden wenn Kalender, Termine, Schichtplan, ScheduleBuilderModern, Regeltermine, Einzeltermine, Mitarbeiterzuweisung, Labels, Absagen oder Terminplanung relevant sind.
---

# Dienstplan – Alltagshilfe Fischer

Hauptkomponente: `src/pages/controlboard/ScheduleBuilderModern.tsx` (1425 Zeilen)

## Termin-Typen

| Typ | vorlage_id | ist_ausnahme | Bedeutung |
|-----|-----------|--------------|-----------|
| Einzeltermin | NULL | - | Einmaliger Termin |
| Regeltermin (normal) | gesetzt | false | Automatisch generiert |
| Regeltermin (Ausnahme) | gesetzt | true | Manuell angepasste Instanz |

## Goldene Regel: NIEMALS überschreiben

```
Bestehende Termine IMMER erhalten.
Nur FEHLENDE Termine hinzufügen.
ist_ausnahme = true → NICHT überschreiben.
```

## Termin-Status (9 Werte)

```
unassigned → scheduled → in_progress → completed → abgerechnet → bezahlt
                      ↘ cancelled
                      ↘ nicht_angetroffen
                      ↘ abgesagt_rechtzeitig
```

| Status | Farbe | Bedeutung |
|--------|-------|-----------|
| unassigned | Orange | Kein MA zugewiesen |
| scheduled | Blau | Geplant |
| in_progress | Gelb | Läuft |
| completed | Grün | Durchgeführt |
| cancelled | Rot | Abgesagt (kurzfristig → abrechenbar) |
| nicht_angetroffen | Amber | Kunde nicht da |
| abgesagt_rechtzeitig | Slate | Rechtzeitig abgesagt (nicht abrechenbar) |
| abgerechnet | Emerald | Abgerechnet |
| bezahlt | Teal | Bezahlt |

## Kategorien/Labels (aktuell 5, Spec braucht mehr)

Aktuell implementiert: `Erstgespräch`, `Schulung`, `Intern`, `Regelbesuch`, `Sonstiges`
**Fehlend:** `Meeting`, `Blocker`, `Bewerbungsgespräch`

Absage-Labels sind über Status gelöst (cancelled, abgesagt_rechtzeitig).

## Absage-Logik (teilweise implementiert)

```
Felder vorhanden: absage_datum, absage_kanal (Telefonisch|E-Mail|Persönlich|WhatsApp|Sonstiges)

FEHLEND: 2-Tage-Regel
Wenn (start_at - absage_datum) < 2 Tage → kurzfristig → Status: cancelled (abrechenbar)
Wenn (start_at - absage_datum) >= 2 Tage → rechtzeitig → Status: abgesagt_rechtzeitig
```

## Regeltermine erstellen

```typescript
// 1. Vorlage speichern
const vorlage = await supabase.from('termin_vorlagen').insert({
  titel, kunden_id, mitarbeiter_id, wochentag, start_zeit, dauer_minuten,
  intervall: 'weekly'|'biweekly'|'monthly', gueltig_von, gueltig_bis, ist_aktiv: true
});

// 2. Termine generieren (NUR FEHLENDE!)
// via RPC: generate_termine_from_vorlagen()
// oder manuell: Existenz prüfen → Insert wenn nicht vorhanden
```

## Einzeltermin aus Serie ändern

```typescript
// RICHTIG: Ausnahme markieren
await supabase.from('termine').update({
  ist_ausnahme: true,
  ausnahme_grund: 'Zeit geändert',
  start_at: neueZeit,
}).eq('id', terminId);
// vorlage_id bleibt erhalten!
```

## Bekannte Bugs

1. **Series-Move Conflict**: `checkForConflicts()` Zeile ~1229 ohne targetDate
2. **Kein Copy**: Nur Cut/Paste, kein Duplicate
3. **Keine Pausen-Validierung**: 15min Mindestpause fehlt
4. **Keine Abwesenheits-Prüfung**: DnD prüft MA-Abwesenheiten nicht
5. **Kein State Machine**: Jede Status-Transition möglich

## Zeitzone

IMMER `Europe/Berlin`. DB-Werte als `TIMESTAMPTZ` (UTC).

## DnD (@dnd-kit)

- `DraggableAppointment.tsx`: `useSortable()` mit CSS transforms
- `ProScheduleCalendar.tsx`: Drop-Zones mit `useDroppable()`
- Activation: 8px distance (gegen versehentliches Drag)
- Conflict-Warning bei Drop auf besetzten Slot

## Relevante Dateien

```
src/pages/controlboard/ScheduleBuilderModern.tsx  # Hauptseite
src/components/schedule/dialogs/                   # Create/Edit/Detail Dialoge
src/components/schedule/calendar/                  # Kalenderansichten
src/components/schedule/DraggableAppointment.tsx   # DnD-Karte
src/components/schedule/panels/                    # Konflikte, SmartAssignment
src/hooks/useAppointments.ts                       # Termin-Queries
```

## Detailregeln

Vollständige Architektur: [termin-regeln.md](termin-regeln.md)
