import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

import {
  CalendarIcon, Download, Clock, Users, TrendingDown,
  CalendarDays, Loader2, X, Filter, ChevronDown,
} from 'lucide-react';

import {
  useReportingData,
  useMitarbeiterList,
  useKundenList,
  type ReportingTermin,
} from '@/hooks/useReportingData';
import type { TerminStatus } from '@/types/domain';

// ─── Status Labels ──────────────────────────────────────────

const STATUS_LABELS: Record<TerminStatus, string> = {
  unassigned: 'Nicht zugewiesen',
  scheduled: 'Geplant',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  abgerechnet: 'Abgerechnet',
  bezahlt: 'Bezahlt',
  nicht_angetroffen: 'Nicht angetroffen',
  abgesagt_rechtzeitig: 'Rechtzeitig abgesagt',
};

const STATUS_VARIANTS: Record<TerminStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  unassigned: 'outline',
  scheduled: 'secondary',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
  abgerechnet: 'secondary',
  bezahlt: 'default',
  nicht_angetroffen: 'destructive',
  abgesagt_rechtzeitig: 'outline',
};

// ─── Multi-Select Filter Component ──────────────────────────

interface MultiFilterProps {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
}

function MultiFilter({ label, options, selected, onSelectionChange, isLoading }: MultiFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleItem = useCallback(
    (id: string) => {
      onSelectionChange(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      );
    },
    [selected, onSelectionChange]
  );

  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[180px] h-10">
          <span className="truncate">
            {selected.length === 0
              ? label
              : `${label} (${selected.length})`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`${label} suchen...`} />
          <CommandList>
            <CommandEmpty>Keine Ergebnisse.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="max-h-[200px]">
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={opt.name}
                      onSelect={() => toggleItem(opt.id)}
                    >
                      <Checkbox
                        checked={selected.includes(opt.id)}
                        className="mr-2"
                      />
                      <span className="truncate">{opt.name}</span>
                    </CommandItem>
                  ))}
                </ScrollArea>
              )}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full" onClick={clearAll}>
                  <X className="mr-2 h-3 w-3" />
                  Auswahl aufheben
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Date Picker Component ──────────────────────────────────

interface DatePickerProps {
  label: string;
  date: Date;
  onDateChange: (date: Date) => void;
}

function DatePicker({ label, date, onDateChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal h-10 min-w-[160px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{format(date, 'dd.MM.yyyy', { locale: de })}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2 text-sm font-medium text-muted-foreground">{label}</div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            if (day) {
              onDateChange(day);
              setOpen(false);
            }
          }}
          locale={de}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Custom Chart Tooltip ───────────────────────────────────

interface ChartTooltipPayloadEntry {
  value?: number;
  payload?: {
    mitarbeiterName?: string;
    gesamtStunden?: number;
    anzahlTermine?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium">{data.mitarbeiterName}</p>
      <p className="text-sm text-muted-foreground">
        {data.gesamtStunden?.toFixed(1)} Stunden
      </p>
      <p className="text-sm text-muted-foreground">
        {data.anzahlTermine} Termine
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function Reporting() {
  const now = new Date();

  const [dateFrom, setDateFrom] = useState<Date>(() => startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date>(() => endOfMonth(now));
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<string[]>([]);
  const [selectedKunden, setSelectedKunden] = useState<string[]>([]);

  const { data: mitarbeiterOptions, isLoading: mitarbeiterLoading } = useMitarbeiterList();
  const { data: kundenOptions, isLoading: kundenLoading } = useKundenList();

  const { data: reportData, isLoading: reportLoading, isError } = useReportingData({
    dateFrom,
    dateTo,
    mitarbeiterIds: selectedMitarbeiter,
    kundenIds: selectedKunden,
  });

  // Chart data
  const chartData = useMemo(() => {
    if (!reportData) return [];
    return reportData.mitarbeiterStunden.map((ms) => ({
      mitarbeiterName: ms.mitarbeiterName.length > 15
        ? ms.mitarbeiterName.substring(0, 15) + '...'
        : ms.mitarbeiterName,
      fullName: ms.mitarbeiterName,
      gesamtStunden: Math.round(ms.gesamtStunden * 10) / 10,
      anzahlTermine: ms.anzahlTermine,
      fill: ms.farbe,
    }));
  }, [reportData]);

  // CSV Export
  const handleCsvExport = useCallback(() => {
    if (!reportData?.termine.length) return;

    const csvRows = reportData.termine.map((t: ReportingTermin) => ({
      Datum: format(new Date(t.startAt), 'dd.MM.yyyy', { locale: de }),
      Von: format(new Date(t.startAt), 'HH:mm', { locale: de }),
      Bis: format(new Date(t.endAt), 'HH:mm', { locale: de }),
      Kunde: t.kundenName,
      Mitarbeiter: t.mitarbeiterName,
      'Dauer (h)': t.dauerStunden.toFixed(2),
      Status: STATUS_LABELS[t.status] ?? t.status,
    }));

    const csv = Papa.unparse(csvRows, { delimiter: ';' });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bericht_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportData, dateFrom, dateTo]);

  const summary = reportData?.summary;
  const hasActiveFilters = selectedMitarbeiter.length > 0 || selectedKunden.length > 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Berichte</h1>
        <p className="text-muted-foreground">
          Termine und Stunden pro Mitarbeiter oder Kunde im Zeitraum{' '}
          {format(dateFrom, 'dd.MM.yyyy', { locale: de })} &ndash;{' '}
          {format(dateTo, 'dd.MM.yyyy', { locale: de })}
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />

            <DatePicker label="Von" date={dateFrom} onDateChange={setDateFrom} />
            <span className="text-muted-foreground">&ndash;</span>
            <DatePicker label="Bis" date={dateTo} onDateChange={setDateTo} />

            <Separator orientation="vertical" className="h-8 hidden md:block" />

            <MultiFilter
              label="Mitarbeiter"
              options={mitarbeiterOptions ?? []}
              selected={selectedMitarbeiter}
              onSelectionChange={setSelectedMitarbeiter}
              isLoading={mitarbeiterLoading}
            />

            <MultiFilter
              label="Kunden"
              options={kundenOptions ?? []}
              selected={selectedKunden}
              onSelectionChange={setSelectedKunden}
              isLoading={kundenLoading}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedMitarbeiter([]);
                  setSelectedKunden([]);
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Filter zurücksetzen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {reportLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {reportData && !reportLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamt-Termine</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.gesamtTermine ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  im gewählten Zeitraum
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamt-Stunden</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.gesamtStunden ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  ohne stornierte Termine
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durchschnitt / MA</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.durchschnittProMitarbeiter ?? 0} h
                </div>
                <p className="text-xs text-muted-foreground">
                  Stunden pro Mitarbeiter
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stornoquote</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.stornoquote ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  storniert / abgesagt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stunden pro Mitarbeiter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="mitarbeiterName"
                        tick={{ fontSize: 12 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        className="fill-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="fill-muted-foreground"
                        label={{
                          value: 'Stunden',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 12 },
                        }}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar
                        dataKey="gesamtStunden"
                        radius={[4, 4, 0, 0]}
                        fill="hsl(var(--primary))"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detail Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detailliste</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCsvExport}
                disabled={!reportData.termine.length}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV Export
              </Button>
            </CardHeader>
            <CardContent>
              {reportData.termine.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Keine Termine im gewählten Zeitraum gefunden.
                </p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Zeit</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead className="text-right">Dauer (h)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.termine.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(t.startAt), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(t.startAt), 'HH:mm')} &ndash;{' '}
                            {format(new Date(t.endAt), 'HH:mm')}
                          </TableCell>
                          <TableCell>{t.kundenName}</TableCell>
                          <TableCell>{t.mitarbeiterName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {t.dauerStunden.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[t.status] ?? 'outline'}>
                              {STATUS_LABELS[t.status] ?? t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
