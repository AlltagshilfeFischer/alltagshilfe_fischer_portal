

## Plan: Kundendetails fuer Mitarbeiter erweitern

### Ansatz
Wenn der Mitarbeiter im Dashboard auf einen Termin klickt, wird statt nur dem EmployeeChangeRequestDialog ein **Kundeninfo-Dialog** geoeffnet, der alle relevanten Kundendaten anzeigt. Von dort kann der Mitarbeiter optional einen Aenderungsantrag stellen.

### Aenderungen

**1. Termin-Query in `MitarbeiterDashboard.tsx` erweitern**
- Mehr Kundenfelder laden: `vorname, nachname, strasse, plz, stadt, stadtteil, telefonnr, pflegegrad, pflegekasse, versichertennummer, sonstiges`
- Zusaetzlich: Notfallkontakte und Zeitfenster separat laden (pro Kunde, bei Klick oder vorab)

**2. Neue Komponente `src/components/mitarbeiter/KundenInfoDialog.tsx` erstellen**
- Dialog der beim Klick auf einen Termin aufgeht
- Zeigt:
  - **Termin-Info**: Titel, Datum, Uhrzeit
  - **Kundenstammdaten**: Vorname, Nachname, Adresse (mit Google Maps Link), Telefon
  - **Pflege-Info**: Pflegegrad, Pflegekasse, Versichertennummer
  - **Notfallkontakte**: Name + Telefon (aus `notfallkontakte`-Tabelle, geladen per kunden_id)
  - **Zeitfenster**: Wochentag + Von/Bis (aus `kunden_zeitfenster`-Tabelle)
  - **Besondere Hinweise**: Feld `sonstiges`
- Button "Aenderungsantrag stellen" oeffnet den bestehenden EmployeeChangeRequestDialog
- Notfallkontakte und Zeitfenster werden per separatem Query geladen wenn der Dialog oeffnet

**3. `MitarbeiterDashboard.tsx` anpassen**
- `handleEditAppointment` oeffnet den neuen KundenInfoDialog statt direkt den ChangeRequestDialog
- KundenInfoDialog hat einen Button zum Wechsel zum ChangeRequestDialog

### Keine DB-Aenderungen noetig
Alle Felder und Tabellen existieren bereits. RLS-Policies erlauben Mitarbeitern Lesezugriff auf zugewiesene Kunden, Notfallkontakte und Zeitfenster (via Termine-Join).

