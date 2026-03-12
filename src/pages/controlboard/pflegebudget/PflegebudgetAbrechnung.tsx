import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, getMonth, getYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { Download, Lock, Clock, CalendarCheck, User, Euro, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useCustomers } from '@/hooks/useCustomers';
import { useBudgetTransactionsByMonth, useCloseBillingMonth } from '@/hooks/useBudgetTransactions';
import { useUserRole } from '@/hooks/useUserRole';
import { useTariffs } from '@/hooks/useTariffs';
import { useCareLevels } from '@/hooks/useCareLevels';
import {
  isPrivateInsured,
  formatCurrency,
  aggregateConsumed,
  buildAvailability,
  assignTransactionTypes,
  buildBillingSuggestion,
  getBillingStatus,
  calculateTransactionAmount,
} from '@/lib/pflegebudget/budgetCalculations';
import type { AllocationStatus, BudgetTransaction, ServiceType } from '@/types/domain';

// ─── Hilfsfunktionen ────────────────────────────────────────

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i <= 11; i++) {
    const date = subMonths(now, i);
    options.push({
      value: `${getYear(date)}-${getMonth(date) + 1}`,
      label: format(date, 'MMMM yyyy', { locale: de }),
      year: getYear(date),
      month: getMonth(date) + 1,
    });
  }
  return options;
}

function StatusBadge({ status }: { status: AllocationStatus }) {
  if (status === 'OK') {
    return <Badge className="bg-green-600 text-white text-xs">OK</Badge>;
  }
  if (status === 'OPTIMIZE') {
    return <Badge className="bg-orange-500 text-white text-xs">Optimierung</Badge>;
  }
  return <Badge className="bg-red-600 text-white text-xs">Budget überschritten</Badge>;
}

function exportCsv(rows: AbrechnungsTableRow[], monthLabel: string) {
  const BOM = '\ufeff';
  const headers = ['Klient', 'PG', 'Entlastung', 'Kombi', 'Verhinderung', 'Privat', 'Gesamt', 'Status'];
  const lines = rows.map((r) => [
    `${r.nachname}, ${r.vorname}`,
    r.pflegegrad,
    r.entlastung.toFixed(2).replace('.', ','),
    r.kombi.toFixed(2).replace('.', ','),
    r.verhinderung.toFixed(2).replace('.', ','),
    r.isPrivate ? 'Ja' : 'Nein',
    r.total.toFixed(2).replace('.', ','),
    r.status,
  ].join(';'));

  const content = BOM + [headers.join(';'), ...lines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abrechnung_${monthLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ──────────────────────────────────────────────────

type AbrechnungsTableRow = {
  kundenId: string;
  vorname: string;
  nachname: string;
  pflegegrad: number;
  entlastung: number;
  kombi: number;
  verhinderung: number;
  privat: number;
  total: number;
  restEntlastung: number;
  restKombi: number;
  restVP: number;
  status: AllocationStatus;
  isPrivate: boolean;
  transactionUpdates: Array<{
    id: string;
    service_type: ServiceType;
    hourly_rate: number;
    travel_flat_total: number;
    total_amount: number;
  }>;
};

// ─── Hauptkomponente ─────────────────────────────────────────

export default function PflegebudgetAbrechnung() {
  const navigate = useNavigate();
  const monthOptions = getMonthOptions();
  const defaultOption = monthOptions[1] ?? monthOptions[0]; // Vormonat als Default

  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultOption.value);
  const [statusFilter, setStatusFilter] = useState<'all' | AllocationStatus>('all');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const { isBuchhaltung } = useUserRole();
  const canEdit = !isBuchhaltung;

  const selectedOption = monthOptions.find((o) => o.value === selectedMonthKey) ?? defaultOption;
  const { year, month } = selectedOption;

  const { data: customers = [] } = useCustomers({ onlyActive: true });
  const { data: transactions = [] } = useBudgetTransactionsByMonth(year, month);
  const { data: tariffs = [] } = useTariffs();
  const { data: careLevels = [] } = useCareLevels();
  const closeMutation = useCloseBillingMonth();

  // ─── Abrechnungszeilen berechnen ──────────────────────────

  const tableRows = useMemo<AbrechnungsTableRow[]>(() => {
    if (!tariffs.length || !careLevels.length) return [];

    const txByClient = new Map<string, BudgetTransaction[]>();
    for (const tx of transactions) {
      const list = txByClient.get(tx.client_id) ?? [];
      list.push(tx);
      txByClient.set(tx.client_id, list);
    }

    const rows: AbrechnungsTableRow[] = [];

    for (const kunde of customers) {
      const clientTx = txByClient.get(kunde.id) ?? [];
      if (clientTx.length === 0) continue;

      // Jahres-Transaktionen für consumed-Berechnung (billed=true)
      const yearlyTx = clientTx.filter(
        (tx) => new Date(tx.service_date).getFullYear() === year,
      );
      const monthTx = clientTx; // bereits gefiltert auf Monat

      const consumedYear = aggregateConsumed(yearlyTx, tariffs, true);
      const consumedKombiMonth = aggregateConsumed(
        monthTx.filter((tx) => tx.service_type === 'KOMBI' && tx.billed),
        tariffs,
        true,
      ).KOMBI;

      const kundeExtended = kunde as typeof kunde & {
        entlastung_genehmigt?: boolean | null;
        privatrechnung_erlaubt?: boolean | null;
        initial_budget_entlastung?: number | null;
        verhinderungspflege_genehmigt?: boolean | null;
        pflegesachleistung_genehmigt?: boolean | null;
      };

      const availability = buildAvailability(
        kundeExtended,
        consumedYear,
        consumedKombiMonth,
        careLevels,
        month,
        year,
      );

      const assigned = assignTransactionTypes(monthTx, kundeExtended, availability, tariffs);
      const suggestion = buildBillingSuggestion(assigned, tariffs);
      const status = getBillingStatus(
        kunde.pflegegrad ?? 0,
        suggestion,
        kundeExtended.initial_budget_entlastung,
        month,
        consumedYear.ENTLASTUNG,
      );

      const isPrivate = isPrivateInsured(kunde.versichertennummer);

      rows.push({
        kundenId: kunde.id,
        vorname: kunde.vorname ?? '',
        nachname: kunde.nachname ?? (kunde.name ?? ''),
        pflegegrad: kunde.pflegegrad ?? 0,
        entlastung: suggestion.entlastung,
        kombi: suggestion.kombi,
        verhinderung: suggestion.verhinderung,
        privat: suggestion.privat,
        total: suggestion.total,
        restEntlastung: availability.entlastungAvailable - suggestion.entlastung,
        restKombi: availability.kombiAvailable - suggestion.kombi,
        restVP: availability.vpRemainingYear - suggestion.verhinderung,
        status,
        isPrivate,
        transactionUpdates: assigned.map((tx) => {
          const { hourlyRate, travelFlatTotal, totalAmount } = calculateTransactionAmount(
            tx.hours,
            tx.visits,
            tx.suggestedType,
            tariffs,
          );
          return {
            id: tx.id,
            service_type: tx.suggestedType,
            hourly_rate: hourlyRate,
            travel_flat_total: travelFlatTotal,
            total_amount: totalAmount,
          };
        }),
      });
    }

    return rows.sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
  }, [customers, transactions, tariffs, careLevels, year, month]);

  // ─── Gefilterte Zeilen ────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return tableRows;
    return tableRows.filter((r) => r.status === statusFilter);
  }, [tableRows, statusFilter]);

  // ─── KPIs ─────────────────────────────────────────────────

  const totalHours = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.hours, 0),
    [transactions],
  );
  const totalVisits = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.visits, 0),
    [transactions],
  );
  const privateCount = useMemo(
    () =>
      tableRows.filter(
        (r) => r.isPrivate || r.pflegegrad === 0 || r.privat > 0,
      ).length,
    [tableRows],
  );
  const grandTotal = useMemo(() => tableRows.reduce((sum, r) => sum + r.total, 0), [tableRows]);

  // ─── Summenzeile ──────────────────────────────────────────

  const sums = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          entlastung: acc.entlastung + r.entlastung,
          kombi: acc.kombi + r.kombi,
          verhinderung: acc.verhinderung + r.verhinderung,
          total: acc.total + r.total,
        }),
        { entlastung: 0, kombi: 0, verhinderung: 0, total: 0 },
      ),
    [filteredRows],
  );

  // ─── Monat abschließen ────────────────────────────────────

  const eligibleRows = tableRows.filter((r) => r.status !== 'BUDGET_EXCEEDED');
  const exceededRows = tableRows.filter((r) => r.status === 'BUDGET_EXCEEDED');
  const hasBilled = transactions.some((tx) => tx.billed);

  function handleCloseMonth() {
    const updates = eligibleRows.flatMap((r) => r.transactionUpdates);
    closeMutation.mutate(
      { transactionUpdates: updates },
      { onSuccess: () => setCloseDialogOpen(false) },
    );
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM_yyyy', { locale: de });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pflegebudget Abrechnung</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monatliche Abrechnungsvorschläge gegen Pflegebudgets
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="BUDGET_EXCEEDED">Budget überschritten</SelectItem>
              <SelectItem value="OPTIMIZE">Optimierung</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filteredRows, monthLabel)}
            disabled={filteredRows.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV exportieren
          </Button>
          {canEdit && !hasBilled && tableRows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCloseDialogOpen(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Monat abschließen
            </Button>
          )}
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Gesamtstunden</p>
              <p className="text-xl font-bold">{totalHours.toFixed(1)} h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Anzahl Termine</p>
              <p className="text-xl font-bold">{totalVisits}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Privat-Klienten</p>
              <p className="text-xl font-bold">{privateCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-3">
            <Euro className="h-8 w-8" />
            <div>
              <p className="text-xs opacity-80">Errechneter Umsatz</p>
              <p className="text-xl font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Abrechnungsvorschläge</CardTitle>
          <CardDescription>
            Vorgeschlagene Abrechnungsbeträge für{' '}
            {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: de })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>PG</TableHead>
                <TableHead className="text-right">Entlastung</TableHead>
                <TableHead className="text-right">Kombi</TableHead>
                <TableHead className="text-right">Verhinderung</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
                <TableHead className="text-right">Rest Entl.</TableHead>
                <TableHead className="text-right">Rest Kombi</TableHead>
                <TableHead className="text-right">Rest VP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Keine Abrechnungen für diesen Monat
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredRows.map((row) => (
                    <TableRow
                      key={row.kundenId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate(
                          `/dashboard/controlboard/pflegebudget/${row.kundenId}/${year}/${month}`,
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {row.nachname}, {row.vorname}
                      </TableCell>
                      <TableCell>PG {row.pflegegrad}</TableCell>
                      <TableCell className="text-right">
                        {row.entlastung > 0 ? formatCurrency(row.entlastung) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.kombi > 0 ? formatCurrency(row.kombi) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.verhinderung > 0 ? formatCurrency(row.verhinderung) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm ${row.restEntlastung < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}
                      >
                        {formatCurrency(row.restEntlastung)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm ${row.restKombi < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}
                      >
                        {formatCurrency(row.restKombi)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm ${row.restVP < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}
                      >
                        {formatCurrency(row.restVP)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summenzeile */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Gesamt ({filteredRows.length} Klienten)</TableCell>
                    <TableCell className="text-right">{formatCurrency(sums.entlastung)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sums.kombi)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sums.verhinderung)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sums.total)}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monat abschließen Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monat abschließen</DialogTitle>
            <DialogDescription>
              {eligibleRows.length} Klienten werden abgerechnet. Gesamtbetrag:{' '}
              {formatCurrency(eligibleRows.reduce((s, r) => s + r.total, 0))}
            </DialogDescription>
          </DialogHeader>

          {exceededRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                {exceededRows.length} Klient(en) werden übersprungen (Budget überschritten)
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {exceededRows.map((r) => (
                  <li key={r.kundenId}>
                    {r.nachname}, {r.vorname} — Privatanteil: {formatCurrency(r.privat)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-500">
                Diese müssen über die Detailseite manuell korrigiert werden.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseMonth}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? 'Wird abgeschlossen...' : 'Monat abschließen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
