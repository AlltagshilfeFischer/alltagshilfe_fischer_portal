

## Plan: Kundenbearbeitung mit Tabs (Stammdaten, Abrechnung, Dokumente)

### Problem
Der aktuelle `CustomerEditDialog` ist ein flaches Formular ohne Tabs. Der Erstellungs-Wizard (`CreateCustomerWizard`) hat dagegen drei Tabs: Stammdaten, Abrechnung, Dokumente. Beim Bearbeiten fehlen die Abrechnung- und Dokumente-Tabs komplett.

### Loesung
Den `CustomerEditDialog` auf eine Tab-basierte Struktur umbauen, die die gleichen Wizard-Step-Komponenten wiederverwendet.

### Aenderungen

**1. `src/components/customers/CustomerEditDialog.tsx`**
- Tabs einfuehren: `Stammdaten`, `Abrechnung`, `Dokumente`
- **Tab Stammdaten**: Bestehende Formularfelder (persoenliche Daten, Kontakt, Pflege, Status, Ein-/Austritt, Zeitfenster) bleiben wie bisher
- **Tab Abrechnung**: `StepAbrechnung`-Komponente einbinden (Kasse/Privat, Verhinderungspflege, Pflegesachleistung, Budget-Priorisierung). State fuer `budgetOrder` und `draggedBudget` hinzufuegen, initialisiert aus `editingCustomer.budget_prioritaet`
- **Tab Dokumente**: `StepDokumente`-Komponente einbinden fuer neue Uploads. Zusaetzlich vorhandene Dokumente aus DB laden und anzeigen
- Budget-Felder (`verhinderungspflege_aktiv/beantragt/genehmigt/budget`, `pflegesachleistung_*`, `budget_prioritaet`) werden beim Speichern mit uebernommen

**2. `src/hooks/useCustomerMutations.ts`**
- `updateCustomerMutation` erweitern: `budget_prioritaet`, alle `verhinderungspflege_*` und `pflegesachleistung_*` Felder mit speichern (aktuell werden diese vermutlich schon durchgereicht, muss verifiziert werden)

**3. `src/pages/controlboard/MasterData.tsx`**
- `handleEditCustomer`: Beim Laden des Kunden auch `budget_prioritaet` in `budgetOrder` State initialisieren, damit die Abrechnung-Tab korrekt vorausgefuellt ist

### Keine DB-Aenderungen noetig
Alle Felder existieren bereits in der `kunden`-Tabelle.

