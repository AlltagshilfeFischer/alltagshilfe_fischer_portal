## Test Results
**Status: PASS**
**Tests run:** 9 | **Passed:** 9 | **Failed:** 0

---

## Test Cases

### 1. Zod Schema Fix (Batch 2 — kunden_id optional)

- [PASS] `kunden_id` is `.nullable().optional()` — Line 643: `kunden_id: z.string().uuid('Ungültige Kunden-ID').nullable().optional()`
- [PASS] Schema includes `notizen` field — Line 653: `notizen: z.string().nullable().optional()`
- [PASS] Schema includes `kategorie` field — Line 654: `kategorie: z.string().nullable().optional()`
- [PASS] Insert payload uses `kunden_id: payload.kunden_id ?? null` — Line 677
- [PASS] Insert payload includes `notizen: payload.notizen ?? null` — Line 682
- [PASS] Insert payload includes `kategorie: payload.kategorie ?? null` — Line 683
- [PASS] `loadData` transformation includes `kategorie` — Line 195: `kategorie: app.kategorie`

---

### 2. DnD Conflict Fix (Batch 3)

- [PASS] `checkForConflicts` accepts `targetDate?: Date` parameter — Line 389
- [PASS] When `targetDate` is provided, start/end times are recalculated BEFORE conflict check — Lines 397–403: sets `appointmentStart` and `appointmentEnd` from `targetDate` while preserving the original hours/minutes
- [PASS] Call site in `handleDragEnd` passes `targetDate` — Line 596: `checkForConflicts(appointmentId, employeeId, targetDate)`

---

### 3. Unzugewiesen Fix (Batch 3/11)

- [PASS] `onUpdate` handler forces `mitarbeiter_id` to `null` when `status === 'unassigned'` — Lines 1144–1146:
  ```ts
  const effectiveMitarbeiterId = appointment.status === 'unassigned'
    ? null
    : appointment.mitarbeiter_id;
  ```
- [PASS] `onUpdate` includes `kategorie` in update data — Line 1157
- [PASS] `onUpdate` includes `absage_datum` in update data — Line 1158
- [PASS] `onUpdate` includes `absage_kanal` in update data — Line 1159
- [PASS] Status Select in `AppointmentDetailDialog.tsx` sets `mitarbeiter_id = null` when 'unassigned' is selected — Lines 566–568
- [PASS] Toast notification is shown when status changes to 'unassigned' — Line 568: `toast({ title: 'Info', description: 'Mitarbeiter-Zuweisung wird entfernt.' })`

---

### 4. Error Messages (Batch 3)

- [PASS] `assignAppointment` catch block produces specific error messages — Lines 475–477:
  ```ts
  const errorMsg = error?.message?.includes('network')
    ? 'Netzwerkfehler — bitte Verbindung prüfen.'
    : `Fehler beim Zuweisen: ${error?.message || 'Unbekannter Fehler'}`;
  ```
  The message is not a generic static string; it branches on error type and appends `error.message`.
- [PASS] Success toast in `assignAppointment` handles null customer name — Line 465:
  ```ts
  const appointmentLabel = appointment?.customer?.name || appointment?.titel || 'Termin';
  ```
  Falls back to `titel`, then to the string `'Termin'`, so null customer never causes a crash or empty label.

---

## Notes

All nine checkpoints pass. No issues found. The implementation matches all specified requirements exactly as described in the validation brief.

One minor observation: the `onUpdate` handler's error toast (line 1189) uses a generic `'Fehler beim Aktualisieren.'` message without appending `error.message`. This is inconsistent with the more specific error handling in `assignAppointment`, but it was not in scope for this validation batch.
