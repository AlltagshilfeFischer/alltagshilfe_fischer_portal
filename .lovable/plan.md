

## Plan: Regeltermin-Serie komplett verschieben

### Kontext
Der Dialog existiert bereits in `ScheduleBuilderModern.tsx` (Zeilen 1071-1129), zeigt aber bei "Alle zukuenftigen Termine" nur einen Platzhalter-Toast. Die Logik muss implementiert werden.

### Aenderungen

**1. `ScheduleBuilderModern.tsx` -- Neue Funktion `moveEntireSeries`**

Ersetze den Platzhalter-Toast (Zeilen 1114-1126) durch eine echte Implementierung:

- Aus `seriesMoveDialog` den `vorlage_id`, neuen `employeeId`, und `targetDate` entnehmen
- Neuen Wochentag aus `targetDate` berechnen (JS `getDay()` → DB-Wochentag-Mapping: So=0→6, Mo=1→0, Di=2→1 usw., da DB 0=Mo nutzt)
- Neue Startzeit aus der Originaldauer + Zielzeit berechnen
- **Schritt 1**: `termin_vorlagen` updaten:
  - `wochentag` auf neuen Wochentag
  - `start_zeit` auf neue Uhrzeit
  - `mitarbeiter_id` auf neuen Mitarbeiter (falls geaendert)
- **Schritt 2**: Alle zukuenftigen `termine` der Serie updaten (WHERE `vorlage_id = X` AND `start_at >= now()` AND `ist_ausnahme = false`):
  - Fuer jeden Termin: Berechne neues `start_at` und `end_at` basierend auf dem Wochentag-Offset und der neuen Uhrzeit
  - `mitarbeiter_id` aktualisieren
- Vergangene Termine und Ausnahmen (`ist_ausnahme = true`) bleiben unveraendert
- `loadData()` aufrufen nach Erfolg

**Implementierungsdetail**: Da Supabase-Client kein Batch-Update mit unterschiedlichen Werten pro Zeile erlaubt, werden die zukuenftigen Termine erst geladen, dann einzeln mit berechneten Zeiten aktualisiert (oder per `Promise.all` parallel).

Alternativer Ansatz: Eine DB-Funktion waere eleganter, aber fuer den ersten Schritt reicht Client-seitiges Update.

**2. Keine neuen Dateien oder Komponenten noetig**

Der bestehende `AlertDialog` hat bereits die richtige Struktur. Nur der `onClick`-Handler des "Alle zukuenftigen Termine"-Buttons wird ersetzt.

### Keine DB-Aenderungen noetig
`termin_vorlagen` und `termine` haben bereits alle benoetigten Felder. RLS erlaubt Admins/GF Updates auf beide Tabellen.

