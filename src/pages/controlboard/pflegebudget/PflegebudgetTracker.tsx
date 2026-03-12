import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getYear, getMonth } from 'date-fns';
import { Search, AlertTriangle } from 'lucide-react';
import * as Progress from '@radix-ui/react-progress';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useCustomers } from '@/hooks/useCustomers';
import { useBudgetTransactionsByYear } from '@/hooks/useBudgetTransactions';
import { useTariffs } from '@/hooks/useTariffs';
import { useCareLevels } from '@/hooks/useCareLevels';
import {
  formatCurrency,
  isPrivateInsured,
  aggregateConsumed,
  buildAvailability,
  hasExpiryWarning,
} from '@/lib/pflegebudget/budgetCalculations';
import type { CareLevel, Tariff } from '@/types/domain';

// ─── Hilfskomponenten ────────────────────────────────────────

function BudgetProgressBar({ percentage }: { percentage: number }) {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  return (
    <Progress.Root
      className="relative overflow-hidden bg-secondary rounded-full w-full h-1.5"
      value={clamped}
    >
      <Progress.Indicator
        className="bg-primary h-full transition-transform duration-300"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </Progress.Root>
  );
}

function BudgetCell({
  consumed,
  yearlyTotal,
  available,
}: {
  consumed: number;
  yearlyTotal: number;
  available: number;
}) {
  const percentage = yearlyTotal > 0 ? (consumed / yearlyTotal) * 100 : 0;
  return (
    <div className="space-y-1 min-w-[120px]">
      <span className="text-sm font-medium">{formatCurrency(available)}</span>
      <BudgetProgressBar percentage={percentage} />
      <p className="text-xs text-muted-foreground">
        {formatCurrency(consumed)} von {formatCurrency(yearlyTotal)}
      </p>
    </div>
  );
}

// ─── Hauptkomponente ─────────────────────────────────────────

export default function PflegebudgetTracker() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = getMonth(now) + 1;

  const [search, setSearch] = useState('');
  const [pflegegradFilter, setPflegegradFilter] = useState<string>('all');
  const [budgetartFilter, setBudgetartFilter] = useState<string>('all');
  const [expiringFilter, setExpiringFilter] = useState<string>('all');

  const { data: customers = [] } = useCustomers({ onlyActive: true });
  const { data: tariffs = [] } = useTariffs();
  const { data: careLevels = [] } = useCareLevels();
  const { data: allMonthsData = [] } = useBudgetTransactionsByYear(currentYear);

  const trackerRows = useMemo(() => {
    if (!tariffs.length || !careLevels.length) return [];

    return customers
      .filter((k) => (k.pflegegrad ?? 0) >= 1)
      .map((kunde) => {
        const clientTx = allMonthsData.filter((tx) => tx.client_id === kunde.id);
        const billedTx = clientTx.filter((tx) => tx.billed);
        const consumedYear = aggregateConsumed(billedTx, tariffs, true);

        // Kombi: nur aktuellen Monat
        const currentMonthTx = billedTx.filter((tx) => {
          const d = new Date(tx.service_date);
          return getMonth(d) + 1 === currentMonth;
        });
        const consumedKombiMonth = aggregateConsumed(
          currentMonthTx.filter((tx) => tx.service_type === 'KOMBI'),
          tariffs,
          true,
        ).KOMBI;

        const kundeExtended = kunde as typeof kunde & {
          entlastung_genehmigt?: boolean | null;
          verhinderungspflege_genehmigt?: boolean | null;
          pflegesachleistung_genehmigt?: boolean | null;
          initial_budget_entlastung?: number | null;
        };

        const availability = buildAvailability(
          kundeExtended,
          consumedYear,
          consumedKombiMonth,
          careLevels,
          currentMonth,
          currentYear,
        );

        const expiryWarning = hasExpiryWarning(
          kundeExtended.initial_budget_entlastung,
          consumedYear.ENTLASTUNG,
          currentMonth,
        );

        const totalMonthlyAvailable =
          (availability.entlastungYearlyTotal / 12) +
          availability.kombiMonthlyMax;
        const totalYearlyRemaining =
          availability.entlastungAvailable + availability.vpRemainingYear;

        return {
          kundenId: kunde.id,
          name: `${kunde.nachname ?? ''}, ${kunde.vorname ?? ''}`,
          pflegegrad: kunde.pflegegrad ?? 0,
          availability,
          expiryWarning,
          totalMonthlyAvailable,
          totalYearlyRemaining,
          hasEntlastung: (availability.entlastungYearlyTotal > 0),
          hasKombi: (availability.kombiMonthlyMax > 0),
          hasVP: (availability.vpYearlyTotal > 0),
          consumedYear,
        };
      });
  }, [customers, allMonthsData, tariffs, careLevels, currentMonth, currentYear]);

  // Filter
  const filteredRows = useMemo(() => {
    return trackerRows.filter((row) => {
      if (search && !row.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (pflegegradFilter !== 'all' && row.pflegegrad !== parseInt(pflegegradFilter)) return false;
      if (budgetartFilter === 'ENTLASTUNG' && !row.hasEntlastung) return false;
      if (budgetartFilter === 'KOMBI' && !row.hasKombi) return false;
      if (budgetartFilter === 'VERHINDERUNG' && !row.hasVP) return false;
      if (expiringFilter === 'expiring' && !row.expiryWarning) return false;
      return true;
    });
  }, [trackerRows, search, pflegegradFilter, budgetartFilter, expiringFilter]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgettracker</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Jahresübersicht aller Pflegebudgets {currentYear}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 w-56"
            placeholder="Klient suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={pflegegradFilter} onValueChange={setPflegegradFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Pflegegrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Grade</SelectItem>
            {[1, 2, 3, 4, 5].map((pg) => (
              <SelectItem key={pg} value={String(pg)}>
                PG {pg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={budgetartFilter} onValueChange={setBudgetartFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Budgetart" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Budgets</SelectItem>
            <SelectItem value="ENTLASTUNG">Entlastungsbetrag</SelectItem>
            <SelectItem value="KOMBI">Kombinationsleistung</SelectItem>
            <SelectItem value="VERHINDERUNG">Verhinderungspflege</SelectItem>
          </SelectContent>
        </Select>

        <Select value={expiringFilter} onValueChange={setExpiringFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Ablauf" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="expiring">Ablauf bald</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>PG</TableHead>
                <TableHead>Entlastung</TableHead>
                <TableHead>Kombinationsleistung</TableHead>
                <TableHead>Verhinderungspflege</TableHead>
                <TableHead className="text-right">Monatlich</TableHead>
                <TableHead className="text-right">Restjahr</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Keine Klienten gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.kundenId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/dashboard/controlboard/master-data?kundenId=${row.kundenId}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {row.name}
                        {row.expiryWarning && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">PG {row.pflegegrad}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.hasEntlastung ? (
                        <BudgetCell
                          consumed={row.consumedYear.ENTLASTUNG}
                          yearlyTotal={row.availability.entlastungYearlyTotal}
                          available={row.availability.entlastungAvailable}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.hasKombi ? (
                        <BudgetCell
                          consumed={row.availability.kombiConsumed}
                          yearlyTotal={row.availability.kombiMonthlyMax}
                          available={row.availability.kombiAvailable}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.hasVP ? (
                        <BudgetCell
                          consumed={row.consumedYear.VERHINDERUNG}
                          yearlyTotal={row.availability.vpYearlyTotal}
                          available={row.availability.vpRemainingYear}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.totalMonthlyAvailable)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.totalYearlyRemaining)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{filteredRows.length} Klienten angezeigt</p>
    </div>
  );
}
