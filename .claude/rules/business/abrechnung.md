# Abrechnungs-Regeln – Alltagshilfe Fischer

## Budget-Priorisierung

Standard-Reihenfolge (ueberschreibbar pro Kunde via abrechnungsregeln):
```
1. Kombileistung (§45a, monatlich, verfaellt)
2. Vorjahresrest Entlastung (FIFO, verfaellt 01.07.)
3. Verhinderungspflege (§39, jaehrlich, 3.539€)
4. Entlastungsbetrag (§45b, 131€/Monat)
5. Privat (Fallback, unbegrenzt)
```

## Steuerlogik

```
pflegegrad > 0  → 0% MwSt (§4 Nr. 16 UStG)
pflegegrad = 0 && leistungsart = 'privat' → 19% MwSt
```

## Goldene Regeln

- Keine Doppelabrechnung: Ein Termin NIEMALS in zwei Toepfen voll berechnet
- Restbetrags-Split: Bei Budget < Einsatzkosten → splitten (z.B. 20€ Kasse + 19€ Privat)
- Nur 'completed' Termine sind abrechenbar
- 'abgesagt_rechtzeitig' Termine sind NICHT abrechenbar
- 'cancelled' (kurzfristig) Termine SIND abrechenbar
- Leistungsnachweis-Unterschrift ist Voraussetzung fuer Abrechnung
