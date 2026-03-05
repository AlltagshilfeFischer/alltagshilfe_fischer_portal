

## Plan: Notizfeld in Termindetails hinzufuegen

### Aenderungen

**1. `src/components/schedule/dialogs/AppointmentDetailDialog.tsx`**

- Add a new `Card` section between the conflict/time-window warnings and the `DialogFooter` (around line 789, after the closing `</div>` of `space-y-6`)
- The card contains:
  - A `Textarea` bound to `editedAppointment.notizen`
  - In **view mode**: display the text read-only (or "Keine Notizen" placeholder)
  - In **edit mode**: editable `Textarea` that updates `editedAppointment.notizen` via `setEditedAppointment`
- No additional save logic needed -- `notizen` is already part of the `editedAppointment` object and gets passed to `onUpdate()` which writes to the `termine` table
- Add a dedicated "Notiz speichern" button that saves just the notes field directly via Supabase update, so notes can be saved without entering full edit mode
- The `notizen` field already exists on the `CalendarAppointment` type and `termine` table -- no DB or type changes needed

### Keine DB-Aenderungen noetig

