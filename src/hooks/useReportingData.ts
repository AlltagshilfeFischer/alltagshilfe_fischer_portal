import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes } from 'date-fns';
import type { TerminStatus } from '@/types/domain';

// ─── Types ──────────────────────────────────────────────────

export interface ReportingFilters {
  dateFrom: Date;
  dateTo: Date;
  mitarbeiterIds: string[];
  kundenIds: string[];
}

interface RawTerminRow {
  id: string;
  titel: string;
  start_at: string;
  end_at: string;
  status: TerminStatus;
  iststunden: number | null;
  kunden_id: string;
  mitarbeiter_id: string | null;
  customer: { id: string; name: string | null; vorname: string | null; nachname: string | null } | null;
  employee: { id: string; vorname: string | null; nachname: string | null; farbe_kalender: string | null } | null;
}

export interface ReportingTermin {
  id: string;
  titel: string;
  startAt: string;
  endAt: string;
  status: TerminStatus;
  dauerStunden: number;
  kundenId: string;
  kundenName: string;
  mitarbeiterId: string | null;
  mitarbeiterName: string;
}

export interface MitarbeiterStunden {
  mitarbeiterId: string;
  mitarbeiterName: string;
  farbe: string;
  anzahlTermine: number;
  gesamtStunden: number;
}

export interface ReportingSummary {
  gesamtTermine: number;
  gesamtStunden: number;
  durchschnittProMitarbeiter: number;
  stornoquote: number;
}

export interface ReportingData {
  termine: ReportingTermin[];
  mitarbeiterStunden: MitarbeiterStunden[];
  summary: ReportingSummary;
}

// ─── Helper ─────────────────────────────────────────────────

const CANCELLED_STATUSES: TerminStatus[] = ['cancelled', 'abgesagt_rechtzeitig'];

function computeDauerStunden(row: { iststunden: number | null; start_at: string; end_at: string }): number {
  if (row.iststunden != null && row.iststunden > 0) {
    return row.iststunden;
  }
  const minutes = differenceInMinutes(new Date(row.end_at), new Date(row.start_at));
  return Math.max(0, minutes / 60);
}

function buildEmployeeName(emp: { vorname: string | null; nachname: string | null } | null): string {
  if (!emp) return 'Nicht zugewiesen';
  return [emp.vorname, emp.nachname].filter(Boolean).join(' ') || 'Unbenannt';
}

function buildCustomerName(cust: { name: string | null; vorname: string | null; nachname: string | null } | null): string {
  if (!cust) return 'Unbekannt';
  if (cust.name) return cust.name;
  return [cust.vorname, cust.nachname].filter(Boolean).join(' ') || 'Unbekannt';
}

// ─── Hook ───────────────────────────────────────────────────

export function useReportingData(filters: ReportingFilters) {
  const { dateFrom, dateTo, mitarbeiterIds, kundenIds } = filters;

  return useQuery<ReportingData>({
    queryKey: [
      'reporting',
      dateFrom.toISOString(),
      dateTo.toISOString(),
      mitarbeiterIds,
      kundenIds,
    ],
    queryFn: async () => {
      let query = supabase
        .from('termine')
        .select(`
          id, titel, start_at, end_at, status, iststunden, kunden_id, mitarbeiter_id,
          customer:kunden(id, name, vorname, nachname),
          employee:mitarbeiter(id, vorname, nachname, farbe_kalender)
        `)
        .gte('start_at', dateFrom.toISOString())
        .lte('start_at', dateTo.toISOString())
        .order('start_at', { ascending: true });

      if (mitarbeiterIds.length > 0) {
        query = query.in('mitarbeiter_id', mitarbeiterIds);
      }

      if (kundenIds.length > 0) {
        query = query.in('kunden_id', kundenIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as RawTerminRow[];

      // Map to domain shape
      const termine: ReportingTermin[] = rows.map((row) => ({
        id: row.id,
        titel: row.titel,
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
        dauerStunden: computeDauerStunden(row),
        kundenId: row.kunden_id,
        kundenName: buildCustomerName(row.customer),
        mitarbeiterId: row.mitarbeiter_id,
        mitarbeiterName: buildEmployeeName(row.employee),
      }));

      // Aggregate per employee (exclude cancelled)
      const activeTermine = termine.filter(
        (t) => !CANCELLED_STATUSES.includes(t.status)
      );

      const empMap = new Map<string, MitarbeiterStunden>();

      for (const t of activeTermine) {
        const key = t.mitarbeiterId ?? '__unassigned__';
        const existing = empMap.get(key);
        if (existing) {
          existing.anzahlTermine += 1;
          existing.gesamtStunden += t.dauerStunden;
        } else {
          // Find farbe from raw data
          const rawRow = rows.find((r) => r.id === t.id);
          const farbe = rawRow?.employee?.farbe_kalender ?? '#3B82F6';
          empMap.set(key, {
            mitarbeiterId: key,
            mitarbeiterName: t.mitarbeiterName,
            farbe,
            anzahlTermine: 1,
            gesamtStunden: t.dauerStunden,
          });
        }
      }

      const mitarbeiterStunden = Array.from(empMap.values()).sort(
        (a, b) => b.gesamtStunden - a.gesamtStunden
      );

      // Summary
      const gesamtTermine = termine.length;
      const gesamtStunden = activeTermine.reduce((sum, t) => sum + t.dauerStunden, 0);
      const uniqueMitarbeiter = new Set(activeTermine.map((t) => t.mitarbeiterId ?? '__unassigned__'));
      const durchschnittProMitarbeiter =
        uniqueMitarbeiter.size > 0 ? gesamtStunden / uniqueMitarbeiter.size : 0;
      const cancelledCount = termine.filter((t) =>
        CANCELLED_STATUSES.includes(t.status)
      ).length;
      const stornoquote = gesamtTermine > 0 ? (cancelledCount / gesamtTermine) * 100 : 0;

      return {
        termine,
        mitarbeiterStunden,
        summary: {
          gesamtTermine,
          gesamtStunden: Math.round(gesamtStunden * 100) / 100,
          durchschnittProMitarbeiter: Math.round(durchschnittProMitarbeiter * 100) / 100,
          stornoquote: Math.round(stornoquote * 10) / 10,
        },
      };
    },
  });
}

// ─── Dropdown data hooks ────────────────────────────────────

export function useMitarbeiterList() {
  return useQuery({
    queryKey: ['reporting-mitarbeiter-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mitarbeiter')
        .select('id, vorname, nachname')
        .eq('ist_aktiv', true)
        .order('nachname', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((m) => ({
        id: m.id,
        name: [m.vorname, m.nachname].filter(Boolean).join(' ') || 'Unbenannt',
      }));
    },
  });
}

export function useKundenList() {
  return useQuery({
    queryKey: ['reporting-kunden-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kunden')
        .select('id, name, vorname, nachname')
        .eq('aktiv', true)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((k) => ({
        id: k.id,
        name: k.name ?? ([k.vorname, k.nachname].filter(Boolean).join(' ') || 'Unbekannt'),
      }));
    },
  });
}
