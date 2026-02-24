

# Offene Punkte aus dem WhatsApp-Verlauf - Status-Analyse

## Bereits umgesetzt (erledigt)

| # | Problem | Status |
|---|---------|--------|
| 1 | Kunden-Upload nur 20 Zeilen, kein Scrollen | Behoben: initialRowCount auf 50 erhoht, native Scrolling implementiert |
| 2 | Mandatory nur Vor- und Nachname | Behoben: Nur vorname/nachname sind required |
| 3 | MA-Import nimmt nur 9 von 30 | Behoben: Edge Function mit 16k Tokens und Anweisung alle zu extrahieren |
| 4 | Neuer MA nicht im Dienstplan sichtbar | Behoben: LEFT JOIN statt INNER JOIN auf benutzer |
| 5 | Terminerstellung: Dropdowns hinter dem Fenster | Behoben: z-index Fixes in allen 3 Dialogen |
| 6 | Standarddauer 90 Minuten | Behoben: Default auf 10:30 (= 90min ab 09:00) |
| 7 | Neukunden nicht in Terminauswahl | Behoben: Name-Fallback aus vorname+nachname |
| 8 | Rollendown-/Force-Logout bei Rollenwechsel | Behoben: force-signout Edge Function |

---

## Noch OFFEN - muss umgesetzt werden

### 1. Einzeltermin: Endzeit durch Dauer ersetzen
**Quelle:** "[14:46, 24.2.2026] Beim erstellen eines einzelnen termins wurde ich ebenfalls keine endzeit auswahlen, sondern eine dauer von 90min als standard festsetzen"

**Aktueller Zustand:** `CreateAppointmentDialog` und `CreateAppointmentFromSlotDialog` (Single-Modus) zeigen Start-Zeit UND End-Zeit als zwei separate time-Inputs. Der User mochte stattdessen nur Start-Zeit + Dauer-Slider/Input.

**Anderungen:**
- In `CreateAppointmentDialog.tsx`: `endTime`-State durch `dauerMinuten`-State (default 90) ersetzen. End-Zeit wird automatisch berechnet (startTime + dauer). UI: Dauer als Select oder Number-Input (z.B. 30, 45, 60, 90, 120 Minuten).
- In `CreateAppointmentFromSlotDialog.tsx` (Single-Tab): Gleiche Anderung - endTime durch dauerMinuten ersetzen.

### 2. 12-Uhr-Bug und Zeitfenster-Einschrankung (06:00-22:00)
**Quelle:** "[14:46] Uhrzeit 12 Uhr funkt nicht richtig, er nimmt immer nachts um 0 Uhr" und "[14:47] 10 Uhr abends bis 6 Uhr morgens sollten gar nicht existieren"

**Aktueller Zustand:** Die time-Inputs sind native HTML `<input type="time">` ohne Einschrankung. Das 12-Uhr-Problem konnte an einer AM/PM-Konvertierung im Browser liegen.

**Anderungen:**
- Time-Inputs durch ein Select-Dropdown mit vordefinierten Zeitslots (06:00 bis 21:30, in 15-Min-Schritten) ersetzen. Das verhindert sowohl den 12-Uhr-Bug als auch die Auswahl von Nachtzeiten.
- Betrifft: `CreateAppointmentDialog.tsx`, `CreateAppointmentFromSlotDialog.tsx`, `CreateRecurringAppointmentDialog.tsx`

### 3. Kundenimport: Daten konnen nicht geparst werden
**Quelle:** "[21:49, 23.2.2026] Kundenimport - Daten konnen nich geparst werden"

**Aktueller Zustand:** Die Edge Function (`parse-kunden-text`) ist korrekt konfiguriert. Das Problem liegt wahrscheinlich daran, dass bei grossen Datenmengen (500 Kunden) der Text zu lang fur einen einzigen AI-Aufruf ist.

**Anderungen:**
- Im Frontend (`SmartDataImport.tsx` / `KundenSmartImport.tsx`): Text in Chunks aufteilen (z.B. max. 50 Eintrage pro AI-Aufruf) und die Ergebnisse zusammenfuhren.
- Alternativ: Bessere Fehlermeldung anzeigen wenn das Parsing fehlschlagt, mit Hinweis die Daten in kleineren Portionen einzufugen.

### 4. MA-Import: Nur Name + Arbeitszeiten, Stammdaten fehlen
**Quelle:** "[21:49, 23.2.2026] MA mit name und arbeitszeiten funkt bei einem, allerdings sind daruber hinaus quasi keine stammdaten vorhanden"

**Aktueller Zustand:** Die Edge Function extrahiert theoretisch Telefon, Strasse, PLZ, Stadt, Wochenstunden und Zustandigkeitsbereich. Das Problem ist wahrscheinlich, dass der `MitarbeiterSmartImport` (bzw. der Import in `BenutzerverwaltungNeu.tsx`) diese Felder beim Einfugen in die DB nicht alle mappt.

**Anderungen:**
- Im Import-Handler in `BenutzerverwaltungNeu.tsx` (`AddMitarbeiterDialog`): Sicherstellen, dass alle von der AI extrahierten Felder (telefon, strasse, plz, stadt, soll_wochenstunden, zustaendigkeitsbereich) beim Insert in die `mitarbeiter`-Tabelle verwendet werden.
- Das AI-Schema in der Edge Function um weitere Felder erweitern: `employment_type`, `qualification`, `hourly_rate` falls gewunscht.

### 5. "Dino wird im Dienstplan nicht als GF gelistet"
**Quelle:** "[10:48, 22.2.2026] Dino wird im Diestplan nicht als GF gelistet, obwohl er einer ist"

**Aktueller Zustand:** Der Dienstplan zeigt Mitarbeiter, aber nicht deren Rolle. Ein GF (Geschaftsfuhrer) ist im System als `mitarbeiter`-Eintrag gespeichert. Er erscheint im Kalender, aber ohne Rollen-Kennzeichnung.

**Anderungen:**
- Im `ScheduleBuilderModern.tsx`: Beim Laden der Mitarbeiter auch deren Rollen aus `user_roles` joinen (uber `benutzer_id -> user_roles.user_id`).
- In der `EmployeeCard` oder `ProScheduleCalendar`: Optional ein Rollen-Badge anzeigen (z.B. "GF" neben dem Namen).
- Alternativ: Pruefen ob Dino uberhaupt als `ist_aktiv=true` und `is_bookable=true` in der `mitarbeiter`-Tabelle steht.

---

## Technische Umsetzung - Zusammenfassung

| Datei | Anderung |
|-------|----------|
| `CreateAppointmentDialog.tsx` | Endzeit durch Dauer-Auswahl ersetzen (Default 90min), Zeitslot-Select statt time-Input (06:00-21:30) |
| `CreateAppointmentFromSlotDialog.tsx` | Single-Tab: Gleiche Anderungen wie oben |
| `CreateRecurringAppointmentDialog.tsx` | Zeitslot-Select statt time-Input |
| `SmartDataImport.tsx` | Text-Chunking fur grosse Datenmengen, bessere Fehlerbehandlung |
| `BenutzerverwaltungNeu.tsx` | AddMitarbeiterDialog: Alle Stammdaten-Felder beim Import mappen |
| `ScheduleBuilderModern.tsx` | Rollen-Info fur Mitarbeiter laden und anzeigen |
| `EmployeeCard.tsx` oder Kalender-Komponente | Rollen-Badge anzeigen |

