

## Plan: Kundenadresse im Dienstplan mit Google Maps Link

### Aenderungen

**1. `src/hooks/useAppointments.ts` - Adressfelder im Query ergaenzen**
- Die Felder `strasse`, `plz`, `stadt`, `stadtteil` werden bereits teilweise geladen (`stadtteil`, `adresse`), aber `strasse`, `plz`, `stadt` fehlen im Select
- Diese drei Felder zum Customer-Select hinzufuegen

**2. `src/types/domain.ts` - CalendarAppointment.customer erweitern**
- `stadtteil`, `strasse`, `plz`, `stadt` als optionale Felder zum `customer`-Typ in `CalendarAppointment` hinzufuegen

**3. `src/components/schedule/ProAppointmentCard.tsx` - Stadtteil-Badge**
- Unter dem Kundennamen (Zeile 89-91) ein kleines Badge mit `appointment.customer?.stadtteil` anzeigen, wenn vorhanden
- Kompakt: `text-[10px]` mit MapPin-Icon

**4. `src/components/schedule/DraggableAppointment.tsx` - Stadtteil-Badge**
- Analog zum ProAppointmentCard: kleines Stadtteil-Label unter dem Kundennamen anzeigen

**5. `src/components/schedule/dialogs/AppointmentDetailDialog.tsx` - Adresse mit Maps-Link**
- Im Kundeninfo-Block (nach Zeile 652, nach Telefon) einen neuen Adress-Abschnitt einfuegen
- Vollstaendige Adresse (Strasse, PLZ Stadt) anzeigen
- Klickbarer Google Maps Link: `https://maps.google.com/?q=${encodeURIComponent(strasse + ' ' + plz + ' ' + stadt)}`
- MapPin-Icon, Link oeffnet in neuem Tab

**6. `src/pages/controlboard/ScheduleBuilderModern.tsx` - Adressfelder im lokalen Query**
- Pruefen ob der dortige Termin-Query ebenfalls `strasse, plz, stadt, stadtteil` laedt (er nutzt einen eigenen Query, nicht den Hook)

### Keine DB-Aenderungen noetig
Alle Felder existieren bereits in der `kunden`-Tabelle.

