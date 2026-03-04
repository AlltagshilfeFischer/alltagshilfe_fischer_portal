

## Detaillierte Prompts aus deinen Punkten

Hier sind die fertigen, einzeln ausfuehrbaren Prompts:

---

### Prompt 1: Offline-faehige Unterschrift im Leistungsnachweis

Baue die Unterschrift-Funktion in der Leistungsnachweis-Preview so um, dass sie auch bei schlechtem Internet funktioniert. Die Preview-Seite soll nach dem initialen Laden stabil bleiben (kein Neuladen noetig). Die Unterschrift wird lokal im Canvas erfasst und als Base64 im localStorage zwischengespeichert. Beim Speichern wird geprueft, ob eine Internetverbindung besteht - wenn ja, sofort in die Datenbank schreiben (`unterschrift_kunde_bild`). Wenn nein, Unterschrift im localStorage halten und dem Nutzer eine Meldung zeigen ("Unterschrift wird synchronisiert, sobald Internet verfuegbar"). Ein `navigator.onLine`-Listener ueberwacht die Verbindung und synchronisiert automatisch bei Reconnect. Die Preview selbst soll keine weiteren Netzwerk-Requests machen, nachdem die Daten einmal geladen sind.

---

### Prompt 2: Abrechnungslogik mit Leistungstoepfen in der Leistungsnachweis-Preview

Erweitere die Leistungsnachweis-Preview um interaktive Abrechnungs-Checkboxen fuer die Leistungstoepfe. Lade aus der `kunden`-Tabelle die Felder `verhinderungspflege_aktiv`, `pflegesachleistung_aktiv`, `kasse_privat` und `budget_prioritaet` sowie aus der `leistungen`-Tabelle die aktiven Leistungen des Kunden (Art, Kontingent, Verbrauch). Zeige in der Preview folgende Checkboxen (vorausgefuellt aus Kundendaten, aber manuell aenderbar): Kombinationsleistung §38 SGB XI, Entlastungsleistung §45b SGB XI, Verhinderungspflege §39 SGB XI, Haushaltshilfe §38 SGB XI, "Deckeln §45b ___ EUR Rest privat", Privat-Checkbox. Aenderungen an den Checkboxen werden im `leistungsnachweise`-Datensatz gespeichert (neue Spalten noetig falls nicht vorhanden). Die Werte werden dann in das Druckdokument (`LeistungsnachweisPreview.tsx`) uebertragen und dort als angekreuzte/nicht angekreuzte Checkboxen gedruckt.

---

### Prompt 3: Dokumentenverwaltung - Suche und Upload reparieren

Die Suche in der Dokumentenverwaltung (`src/pages/controlboard/Dokumentenverwaltung.tsx`) funktioniert nicht und der Dokumenten-Upload geht nicht richtig. Bitte debugge und repariere beides: (1) Die Suchfunktion soll Dokumente nach Titel, Dateiname und Beschreibung filtern koennen. (2) Der Upload-Prozess (Drag-and-Drop und Datei-Auswahl) muss zuverlaessig funktionieren - Dateien muessen korrekt in den Storage-Bucket `dokumente` hochgeladen und die Metadaten in die `dokumente`-Tabelle geschrieben werden. Teste den Upload-Flow und stelle sicher, dass Fortschrittsanzeige und Fehlermeldungen korrekt funktionieren.

---

### Prompt 4: Kundensuche beim Dokumenten-Upload einbauen

Baue in der Dokumentenverwaltung (`Dokumentenverwaltung.tsx`) eine Kundensuche ein, die beim Upload-Dialog erscheint. Verwende eine Combobox aehnlich der bestehenden `CustomerSearchCombobox` (mit Fuse.js), damit man beim Hochladen eines Dokuments direkt nach dem Kunden suchen und ihn zuordnen kann. Die Combobox soll im Upload-Dialog erscheinen, wenn die Kategorie "Kunde" ausgewaehlt ist, und den gefundenen Kunden als `kunden_id` in den `dokumente`-Datensatz schreiben.

---

### Prompt 5: Kundenadresse im Dienstplan mit Google Maps Link

Zeige im Dienstplan die Kundenadresse an zwei Stellen: (1) Auf der Termin-Karte im Kalender den Stadtteil als Kurzinfo anzeigen (z.B. kleines Badge unter dem Kundennamen). (2) Im Termin-Detail-Dialog (`AppointmentDetailDialog.tsx`) die vollstaendige Adresse (Strasse, PLZ, Stadt) anzeigen mit einem klickbaren Google Maps Link (`https://maps.google.com/?q=STRASSE+PLZ+STADT`). Die Adresse kommt aus der `kunden`-Tabelle (Felder: `strasse`, `plz`, `stadt`, `stadtteil`). Stelle sicher, dass die Kundendaten im Termin-Query mitgeladen werden.

---

### Prompt 6: Kundendetails fuer Mitarbeiter erweitern

Erweitere die Mitarbeiter-Ansicht (`MitarbeiterDashboard.tsx`), damit der Mitarbeiter folgende Kundeninformationen sehen kann, wenn er einen Termin oeffnet oder in seiner Uebersicht ist: Vorname, Nachname, Adresse (Strasse, PLZ, Stadt), Telefonnummer, Notfallkontakt (Name + Telefon aus `notfallkontakte`), Pflegegrad, Pflegekasse, Versichertennummer, Zeitfenster (aus `kunden_zeitfenster`), und besondere Hinweise (Feld `sonstiges`). Keine Abrechnungsdaten (Budgets, Toepfe) anzeigen. Baue dafuer eine Kundeninfo-Karte ein, die im Termin-Detail oder als eigener Bereich angezeigt wird.

---

### Prompt 7: Kundendetails fuer Geschaeftsfuehrer erweitern

Erweitere die Kundendetails-Ansicht fuer den Geschaeftsfuehrer (GF-Sicht), sodass im Dienstplan oder in der Kundenuebersicht alle relevanten Informationen auf einen Blick sichtbar sind: Stammdaten, Kontaktdaten, Pflegedaten, Abrechnungsdaten (Toepfe, Budgets, Prioritaeten), Zeitfenster, Notfallkontakte, zugewiesener Hauptbetreuer, aktive Leistungen mit Kontingenten. Dies kann als erweiterter Detail-Dialog oder als Kunden-Detailseite umgesetzt werden.

---

### Prompt 8: Notizfeld in Termindetails hinzufuegen

Fuege im Termin-Detail-Dialog (`AppointmentDetailDialog.tsx`) ein einfaches Freitext-Notizfeld hinzu. Das Feld soll das bestehende `notizen`-Feld der `termine`-Tabelle nutzen. Es soll als Textarea unterhalb der Termininformationen erscheinen, bearbeitbar sein, und beim Speichern des Termins mit aktualisiert werden. Das Notizfeld soll sowohl fuer Admins/GF als auch fuer Mitarbeiter sichtbar und bearbeitbar sein.

---

### Prompt 9: Regeltermin-Serie komplett verschieben

Wenn ein Regeltermin (mit `vorlage_id`) zum ersten Mal per Drag-and-Drop verschoben wird, soll ein Bestaetigungsdialog erscheinen mit der Option "Gesamte Serie verschieben". Wenn bestaetigt, wird die zugehoerige `termin_vorlagen` aktualisiert (neuer Wochentag, neue Uhrzeit, ggf. neuer Mitarbeiter) und alle zukuenftigen Termine der Serie werden entsprechend angepasst. Bereits vergangene Termine bleiben unveraendert. Der Dialog soll die Optionen bieten: "Nur diesen Termin verschieben" (erstellt Ausnahme mit `ist_ausnahme = true`) oder "Gesamte Serie verschieben" (aktualisiert Vorlage + alle zukuenftigen Termine). Sowohl Wochentag/Uhrzeit als auch Mitarbeiterzuweisung sollen fuer die Serie aenderbar sein.

---

Das sind 9 ausfuehrbare Prompts. Soll ich mit einem bestimmten anfangen, oder soll ich sie der Reihe nach abarbeiten?

