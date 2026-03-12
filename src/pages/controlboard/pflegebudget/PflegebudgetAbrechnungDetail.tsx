import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowLeft, Edit2, ShieldCheck, Download } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useCustomers } from '@/hooks/useCustomers';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useBudgetTransactionsByClientMonth,
  useBudgetTransactionsByClientYear,
  useUpdateTransactionAllocation,
  useCloseBillingMonth,
} from '@/hooks/useBudgetTransactions';
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
import type { ServiceType, BudgetTransaction, AllocationStatus } from '@/types/domain';

function StatusBadge({ status }: { status: AllocationStatus }) {
  const map: Record<AllocationStatus, string> = {
    OK: 'bg-green-600 text-white',
    OPTIMIZE: 'bg-orange-500 text-white',
    BUDGET_EXCEEDED: 'bg-red-600 text-white',
  };
  const label: Record<AllocationStatus, string> = {
    OK: 'OK',
    OPTIMIZE: 'Optimierung',
    BUDGET_EXCEEDED: 'Budget überschritten',
  };
  return <Badge className={`text-xs ${map[status]}`}>{label[status]}</Badge>;
}

function BudgetCard({ label, amount, rest, colorClass }: { label: string; amount: number; rest: number; colorClass?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className={`text-lg font-bold ${colorClass ?? ''}`}>{formatCurrency(amount)}</p>
        <p className={`text-xs ${rest < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
          Rest: {formatCurrency(rest)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function PflegebudgetAbrechnungDetail() {
  const navigate = useNavigate();
  const { kundenId, year: yearStr, month: monthStr } = useParams<{
    kundenId: string;
    year: string;
    month: string;
  }>();

  const year = parseInt(yearStr ?? '0');
  const month = parseInt(monthStr ?? '0');

  const { data: customers = [] } = useCustomers();
  const { data: monthTx = [] } = useBudgetTransactionsByClientMonth(kundenId, year, month);
  const { data: yearTx = [] } = useBudgetTransactionsByClientYear(kundenId, year);
  const { data: tariffs = [] } = useTariffs();
  const { data: careLevels = [] } = useCareLevels();
  const updateMutation = useUpdateTransactionAllocation();
  const closeMutation = useCloseBillingMonth();
  const { isBuchhaltung } = useUserRole();
  const canEdit = !isBuchhaltung;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<BudgetTransaction | null>(null);
  const [newServiceType, setNewServiceType] = useState<ServiceType>('ENTLASTUNG');

  const kunde = customers.find((c) => c.id === kundenId);

  const kundeExtended = kunde as typeof kunde & {
    entlastung_genehmigt?: boolean | null;
    privatrechnung_erlaubt?: boolean | null;
    initial_budget_entlastung?: number | null;
    verhinderungspflege_genehmigt?: boolean | null;
    pflegesachleistung_genehmigt?: boolean | null;
  };

  const { availability, suggestion, status, assigned } = useMemo(() => {
    if (!kundeExtended || !tariffs.length || !careLevels.length) {
      return { availability: null, suggestion: null, status: 'OK' as AllocationStatus, assigned: [] };
    }

    const billedYearTx = yearTx.filter((tx) => tx.billed);
    const consumedYear = aggregateConsumed(billedYearTx, tariffs, true);
    const consumedKombiMonth = aggregateConsumed(
      monthTx.filter((tx) => tx.service_type === 'KOMBI' && tx.billed),
      tariffs,
      true,
    ).KOMBI;

    const avail = buildAvailability(
      kundeExtended,
      consumedYear,
      consumedKombiMonth,
      careLevels,
      month,
      year,
    );

    const txAssigned = assignTransactionTypes(monthTx, kundeExtended, avail, tariffs);
    const sug = buildBillingSuggestion(txAssigned, tariffs);
    const st = getBillingStatus(
      kundeExtended.pflegegrad ?? 0,
      sug,
      kundeExtended.initial_budget_entlastung,
      month,
      consumedYear.ENTLASTUNG,
    );

    return { availability: avail, suggestion: sug, status: st, assigned: txAssigned };
  }, [kundeExtended, monthTx, yearTx, tariffs, careLevels, month, year]);

  const isPrivate = isPrivateInsured(kunde?.versichertennummer);
  const allBilled = monthTx.length > 0 && monthTx.every((tx) => tx.billed);

  function handleEditOpen(tx: BudgetTransaction) {
    setEditingTx(tx);
    setNewServiceType(tx.service_type);
    setEditDialogOpen(true);
  }

  function handleSaveAllocation() {
    if (!editingTx || !tariffs.length) return;
    const { hourlyRate, travelFlatTotal, totalAmount } = calculateTransactionAmount(
      editingTx.hours,
      editingTx.visits,
      newServiceType,
      tariffs,
    );
    updateMutation.mutate(
      { id: editingTx.id, serviceType: newServiceType, hourlyRate, travelFlatTotal, totalAmount },
      { onSuccess: () => setEditDialogOpen(false) },
    );
  }

  function handleFreeigabe() {
    if (!assigned.length || !tariffs.length) return;
    const updates = assigned.map((tx) => {
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
    });
    closeMutation.mutate({ transactionUpdates: updates });
  }

  function exportCsv() {
    const BOM = '\ufeff';
    const headers = ['Datum', 'Leistungsart', 'Stunden', 'Termine', 'Stundensatz', 'Anfahrt', 'Gesamt', 'Zuweisung'];
    const lines = assigned.map((tx) => {
      const { hourlyRate, travelFlatTotal, totalAmount } = calculateTransactionAmount(
        tx.hours,
        tx.visits,
        tx.suggestedType,
        tariffs,
      );
      return [
        format(new Date(tx.service_date), 'dd.MM.yyyy'),
        tx.suggestedType,
        tx.hours.toFixed(2).replace('.', ','),
        tx.visits,
        hourlyRate.toFixed(2).replace('.', ','),
        travelFlatTotal.toFixed(2).replace('.', ','),
        totalAmount.toFixed(2).replace('.', ','),
        tx.allocation_type,
      ].join(';');
    });
    const content = BOM + [headers.join(';'), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abrechnung_${kunde?.nachname}_${year}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!kunde) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Klient nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Zurück-Button + Aktionen */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/controlboard/pflegebudget')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Übersicht
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
          {canEdit && !allBilled && (
            <Button size="sm" onClick={handleFreeigabe} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? 'Wird freigegeben...' : 'Monat freigeben'}
            </Button>
          )}
        </div>
      </div>

      {/* Klient-Info */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {kunde.nachname}, {kunde.vorname}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: de })}
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline">PG {kunde.pflegegrad}</Badge>
          {isPrivate && (
            <Badge variant="secondary">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Privatversichert
            </Badge>
          )}
          {status && <StatusBadge status={status} />}
          {allBilled && <Badge variant="outline">Freigegeben</Badge>}
        </div>
      </div>

      {/* Budget-Karten */}
      {availability && suggestion && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <BudgetCard
            label="Entlastung"
            amount={suggestion.entlastung}
            rest={availability.entlastungAvailable - suggestion.entlastung}
          />
          <BudgetCard
            label="Kombileistung"
            amount={suggestion.kombi}
            rest={availability.kombiAvailable - suggestion.kombi}
          />
          <BudgetCard
            label="Verhinderung"
            amount={suggestion.verhinderung}
            rest={availability.vpRemainingYear - suggestion.verhinderung}
          />
          <BudgetCard
            label="Privat"
            amount={suggestion.privat}
            rest={0}
            colorClass={suggestion.privat > 0 ? 'text-red-600' : undefined}
          />
          <Card className="col-span-2 bg-primary text-primary-foreground">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs opacity-80">Gesamt</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-lg font-bold">{formatCurrency(suggestion.total)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaktionstabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Einzeltransaktionen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Leistungsart</TableHead>
                <TableHead className="text-right">Stunden</TableHead>
                <TableHead className="text-right">Termine</TableHead>
                <TableHead className="text-right">Stundensatz</TableHead>
                <TableHead className="text-right">Anfahrt</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
                <TableHead>Zuweisung</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assigned.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Keine Transaktionen für diesen Monat
                  </TableCell>
                </TableRow>
              ) : (
                assigned.map((tx) => {
                  const { hourlyRate, travelFlatTotal, totalAmount } = calculateTransactionAmount(
                    tx.hours,
                    tx.visits,
                    tx.suggestedType,
                    tariffs,
                  );
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {format(new Date(tx.service_date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tx.suggestedType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{tx.hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{tx.visits}</TableCell>
                      <TableCell className="text-right">{formatCurrency(hourlyRate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(travelFlatTotal)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.allocation_type === 'MANUAL' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {tx.allocation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canEdit && !allBilled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOpen(tx)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Budgettopf ändern Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Budgettopf ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Datum: {editingTx ? format(new Date(editingTx.service_date), 'dd.MM.yyyy') : ''} |{' '}
              {editingTx?.hours.toFixed(2)} h
            </p>
            <Select
              value={newServiceType}
              onValueChange={(v) => setNewServiceType(v as ServiceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTLASTUNG">ENTLASTUNG</SelectItem>
                <SelectItem value="KOMBI">KOMBI</SelectItem>
                <SelectItem value="VERHINDERUNG">VERHINDERUNG</SelectItem>
                <SelectItem value="PRIVAT">PRIVAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveAllocation} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
