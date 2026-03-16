import { SmartDataImport, ColumnConfig, DataRow } from './SmartDataImport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface KundenRow extends DataRow {
  vorname: string;
  nachname: string;
  telefonnr: string;
  email: string;
  strasse: string;
  plz: string;
  stadt: string;
  stadtteil: string;
  geburtsdatum: string;
  pflegegrad: string;
  kategorie: string;
  pflegekasse: string;
  versichertennummer: string;
  sonstiges: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'vorname', label: 'Vorname', required: true, width: 120 },
  { key: 'nachname', label: 'Nachname', required: true, width: 120 },
  { key: 'telefonnr', label: 'Telefon', required: false, width: 130,
    validate: (value) => {
      if (value && !/^[\d\s+\-/().]{5,25}$/.test(value)) {
        return 'Ungültige Telefonnummer';
      }
      return null;
    }
  },
  { key: 'email', label: 'E-Mail', required: false, width: 180,
    validate: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Ungültige E-Mail';
      }
      return null;
    }
  },
  { key: 'strasse', label: 'Straße', required: false, width: 150 },
  { key: 'plz', label: 'PLZ', required: false, width: 80,
    validate: (value) => {
      if (value && !/^\d{5}$/.test(value)) {
        return 'PLZ 5 Ziffern';
      }
      return null;
    }
  },
  { key: 'stadt', label: 'Stadt', required: false, width: 120 },
  { key: 'stadtteil', label: 'Stadtteil', required: false, width: 100 },
  { key: 'geburtsdatum', label: 'Geburtsdatum', required: false, width: 120, hint: 'TT.MM.JJJJ',
    validate: (value) => {
      if (!value) return null;
      const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (!match) return 'Datum: TT.MM.JJJJ';
      const [, day, month, year] = match;
      const date = new Date(`${year}-${month}-${day}`);
      if (isNaN(date.getTime()) || date.getDate() !== parseInt(day, 10)) {
        return 'Ungültiges Datum (z.B. 31.02. existiert nicht)';
      }
      return null;
    }
  },
  { key: 'pflegegrad', label: 'Pflegegrad', required: false, width: 90, hint: '0-5',
    validate: (value) => {
      if (value && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 5)) {
        return 'Pflegegrad 0-5';
      }
      return null;
    }
  },
  { key: 'kategorie', label: 'Kategorie', required: false, width: 110, hint: 'Kunde/Interessent',
    validate: (value) => {
      if (value && !['Kunde', 'Interessent'].includes(value)) {
        return 'Nur "Kunde" oder "Interessent"';
      }
      return null;
    }
  },
  { key: 'pflegekasse', label: 'Pflegekasse', required: false, width: 120 },
  { key: 'versichertennummer', label: 'Versichertennr.', required: false, width: 130 },
  { key: 'sonstiges', label: 'Sonstiges', required: false, width: 200 },
];

const createEmptyRow = (): KundenRow => ({
  id: crypto.randomUUID(),
  vorname: '',
  nachname: '',
  telefonnr: '',
  email: '',
  strasse: '',
  plz: '',
  stadt: '',
  stadtteil: '',
  geburtsdatum: '',
  pflegegrad: '',
  kategorie: '',
  pflegekasse: '',
  versichertennummer: '',
  sonstiges: '',
  errors: [],
});

const parseGermanDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const isoStr = `${year}-${month}-${day}`;
  const date = new Date(isoStr);
  // Prüfen ob das Datum tatsächlich existiert (z.B. 31.02. → overflow würde falsches Datum ergeben)
  if (isNaN(date.getTime()) || date.getDate() !== parseInt(day, 10)) return null;
  return isoStr;
};

interface KundenSmartImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KundenSmartImport({ open, onOpenChange }: KundenSmartImportProps) {
  const queryClient = useQueryClient();

  const handleImport = async (rows: KundenRow[]) => {
    // 1. Bestehende Kunden laden für Duplikat-Check
    const { data: existingCustomers } = await supabase
      .from('kunden')
      .select('vorname, nachname, strasse');

    const normalizeDupKey = (vorname: string, nachname: string, strasse: string) =>
      `${(vorname || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${(nachname || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${(strasse || '').trim().toLowerCase().replace(/\s+/g, ' ')}`;

    const existingKeys = new Set(
      (existingCustomers ?? []).map(c =>
        normalizeDupKey(c.vorname || '', c.nachname || '', c.strasse || '')
      )
    );

    // 2. Import-Zeilen prüfen (DB-Duplikate + Duplikate innerhalb des Imports)
    const seenInBatch = new Set<string>();
    const duplicates: string[] = [];
    const uniqueRows: typeof rows = [];

    for (const row of rows) {
      const key = normalizeDupKey(row.vorname, row.nachname, row.strasse || '');
      if (existingKeys.has(key) || seenInBatch.has(key)) {
        duplicates.push(`${row.vorname} ${row.nachname}`);
      } else {
        seenInBatch.add(key);
        uniqueRows.push(row);
      }
    }

    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} Duplikat(e) übersprungen`, {
        description: duplicates.slice(0, 5).join(', ') + (duplicates.length > 5 ? ` und ${duplicates.length - 5} weitere` : ''),
      });
    }

    if (uniqueRows.length === 0) {
      throw new Error('Alle Einträge sind bereits vorhanden.');
    }

    const customersToInsert = uniqueRows.map(row => ({
      vorname: row.vorname.trim(),
      nachname: row.nachname.trim(),
      telefonnr: row.telefonnr?.trim() || null,
      email: row.email?.trim() || null,
      strasse: row.strasse?.trim() || null,
      plz: row.plz?.trim() || null,
      stadt: row.stadt?.trim() || null,
      stadtteil: row.stadtteil?.trim() || null,
      geburtsdatum: parseGermanDate(row.geburtsdatum),
      pflegegrad: row.pflegegrad ? parseInt(row.pflegegrad, 10) : null,
      kategorie: row.kategorie || 'Kunde',
      pflegekasse: row.pflegekasse?.trim() || null,
      versichertennummer: row.versichertennummer?.trim() || null,
      sonstiges: row.sonstiges?.trim() || null,
      aktiv: (row.kategorie || 'Kunde') === 'Kunde',
      eintritt: new Date().toISOString().slice(0, 10),
    }));

    // Batch insert — bei Fehler Einzelinserts als Fallback
    const { error } = await supabase
      .from('kunden')
      .insert(customersToInsert);

    if (error) {
      // Fallback: einzeln einfügen um fehlerhafte Zeilen zu identifizieren
      let successCount = 0;
      const failedNames: string[] = [];

      for (const customer of customersToInsert) {
        const { error: singleError } = await supabase
          .from('kunden')
          .insert(customer);
        if (singleError) {
          failedNames.push(`${customer.vorname} ${customer.nachname}`);
          console.error(`[KundenImport] Fehler bei ${customer.vorname} ${customer.nachname}:`, singleError.message);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }

      if (failedNames.length > 0) {
        throw new Error(
          `${failedNames.length} Kunde(n) fehlgeschlagen: ${failedNames.slice(0, 3).join(', ')}${failedNames.length > 3 ? ` und ${failedNames.length - 3} weitere` : ''}. ${successCount} erfolgreich importiert.`
        );
      }
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const ImportComponent = SmartDataImport<KundenRow>;

  return (
    <ImportComponent
      open={open}
      onOpenChange={onOpenChange}
      title="Kunden importieren"
      description="Importieren Sie Kunden aus Excel, CSV oder als Freitext. Die Daten werden automatisch erkannt und können vor dem Import korrigiert werden."
      columns={COLUMNS}
      onImport={handleImport}
      createEmptyRow={createEmptyRow}
      initialRowCount={10}
      batchSize={200}
      aiParseFunction="parse-kunden-text"
      aiParseResultKey="kunden"
    />
  );
}
