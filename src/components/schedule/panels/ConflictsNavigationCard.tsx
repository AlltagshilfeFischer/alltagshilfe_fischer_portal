import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Clock, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { CalendarAppointment } from '@/types/domain';

interface ConflictsNavigationCardProps {
  appointments: CalendarAppointment[];
  onNavigateToConflict: (appointmentId: string) => void;
}

interface ConflictGroup {
  employeeName: string;
  employeeId: string;
  appointments: CalendarAppointment[];
}

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

export function ConflictsNavigationCard({
  appointments,
  onNavigateToConflict,
}: ConflictsNavigationCardProps) {
  const [open, setOpen] = useState(false);

  const conflictGroups = useMemo(() => {
    const pairMap = new Map<string, Set<string>>();

    const sortedApps = [...appointments].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    sortedApps.forEach((app, index) => {
      if (!app.mitarbeiter_id) return;

      for (let i = index + 1; i < sortedApps.length; i++) {
        const other = sortedApps[i];
        if (other.mitarbeiter_id !== app.mitarbeiter_id) continue;

        const appStart = new Date(app.start_at);
        const appEnd = new Date(app.end_at);
        const otherStart = new Date(other.start_at);
        const otherEnd = new Date(other.end_at);

        if (appStart < otherEnd && appEnd > otherStart) {
          const key = app.mitarbeiter_id;
          if (!pairMap.has(key)) pairMap.set(key, new Set());
          pairMap.get(key)!.add(app.id);
          pairMap.get(key)!.add(other.id);
        }
      }
    });

    const groups: ConflictGroup[] = [];
    for (const [employeeId, ids] of pairMap) {
      const groupApps = sortedApps
        .filter((a) => ids.has(a.id))
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

      const employeeName = groupApps[0]?.employee?.name ?? 'Unbekannt';
      groups.push({ employeeId, employeeName, appointments: groupApps });
    }

    return groups;
  }, [appointments]);

  const totalConflicts = conflictGroups.reduce(
    (sum, g) => sum + g.appointments.length,
    0
  );

  if (totalConflicts === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="font-bold">{totalConflicts}</span>
          <span className="hidden sm:inline">
            {totalConflicts === 1 ? 'Konflikt' : 'Konflikte'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="px-3 py-2 border-b bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {totalConflicts} {totalConflicts === 1 ? 'Konflikt' : 'Konflikte'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {conflictGroups.length} {conflictGroups.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
            </span>
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-2">
            {conflictGroups.map((group) => (
              <div key={group.employeeId} className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                  <Users className="h-3 w-3" />
                  <span className="font-medium truncate">{group.employeeName}</span>
                  <Badge
                    variant="destructive"
                    className="ml-auto text-[10px] px-1.5 py-0 h-4"
                  >
                    {group.appointments.length}
                  </Badge>
                </div>

                {group.appointments.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      onNavigateToConflict(app.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-1.5 w-full rounded px-2 py-1 text-left text-xs hover:bg-destructive/10 transition-colors"
                  >
                    <Clock className="h-3 w-3 text-destructive/60 flex-shrink-0" />
                    <span className="text-destructive/80 font-medium whitespace-nowrap">
                      {formatTime(app.start_at)}–{formatTime(app.end_at)}
                    </span>
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground/80">
                      {app.customer?.name ?? app.titel}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
