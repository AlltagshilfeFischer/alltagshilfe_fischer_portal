import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const conflictGroups = useMemo(() => {
    const conflictIds = new Set<string>();
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
          conflictIds.add(app.id);
          conflictIds.add(other.id);

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
  const hasConflicts = totalConflicts > 0;

  return (
    <Card
      className={`p-2 ${hasConflicts ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30'}`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={`h-4 w-4 flex-shrink-0 ${hasConflicts ? 'text-destructive' : 'text-muted-foreground'}`}
        />
        <span
          className={`text-sm font-bold ${hasConflicts ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {totalConflicts}
        </span>
        <span className="text-xs text-muted-foreground">
          {totalConflicts === 1 ? 'Konflikt' : 'Konflikte'}
        </span>
      </div>

      {hasConflicts && (
        <ScrollArea className="mt-2 max-h-48">
          <div className="space-y-2">
            {conflictGroups.map((group) => (
              <div key={group.employeeId} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="font-medium truncate">
                    {group.employeeName}
                  </span>
                  <Badge
                    variant="destructive"
                    className="ml-auto text-[10px] px-1.5 py-0 h-4"
                  >
                    {group.appointments.length}
                  </Badge>
                </div>

                <div className="space-y-0.5 pl-4">
                  {group.appointments.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => onNavigateToConflict(app.id)}
                      className="flex items-center gap-2 w-full rounded px-1.5 py-1 text-left text-xs hover:bg-destructive/10 transition-colors group"
                    >
                      <Clock className="h-3 w-3 text-destructive/60 flex-shrink-0" />
                      <span className="text-destructive/80 font-medium whitespace-nowrap">
                        {formatTime(app.start_at)}–{formatTime(app.end_at)}
                      </span>
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-foreground/80 group-hover:text-foreground">
                        {app.customer?.name ?? app.titel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
