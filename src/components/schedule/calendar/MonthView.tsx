import React, { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Employee, CalendarAppointment } from '@/types/domain';

interface MonthViewProps {
  employees: Employee[];
  appointments: CalendarAppointment[];
  currentMonth: Date;
  onEditAppointment: (appointment: CalendarAppointment) => void;
  onSlotClick: (employeeId: string, date: Date) => void;
}

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_CHIPS = 3;

export function MonthView({
  employees,
  appointments,
  currentMonth,
  onEditAppointment,
  onSlotClick,
}: MonthViewProps) {
  const employeeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const emp of employees) {
      map[emp.id] = emp.farbe_kalender || '#3B82F6';
    }
    return map;
  }, [employees]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const app of appointments) {
      const key = format(new Date(app.start_at), 'yyyy-MM-dd');
      const list = map.get(key) || [];
      list.push(app);
      map.set(key, list);
    }
    // Sort each day's appointments by start time
    for (const [key, list] of map) {
      map.set(
        key,
        list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      );
    }
    return map;
  }, [appointments]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayApps = appointmentsByDay.get(dayKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const overflow = dayApps.length - MAX_CHIPS;

            return (
              <div
                key={dayKey}
                className={cn(
                  'min-h-[100px] p-1.5 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/20 transition-colors',
                  !isCurrentMonth && 'opacity-40 bg-muted/10'
                )}
                onClick={() => {
                  // Use the first employee as a fallback for slot click
                  if (employees.length > 0) {
                    onSlotClick(employees[0].id, day);
                  }
                }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium',
                      isCurrentDay
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayApps.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {dayApps.length}
                    </span>
                  )}
                </div>

                {/* Appointment Chips */}
                <div className="space-y-0.5">
                  {dayApps.slice(0, MAX_CHIPS).map((app) => {
                    const color = app.mitarbeiter_id
                      ? employeeColorMap[app.mitarbeiter_id] || '#3B82F6'
                      : '#94A3B8';
                    const customerName =
                      app.customer?.name || app.titel;
                    const time = format(new Date(app.start_at), 'HH:mm');

                    return (
                      <div
                        key={app.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight hover:opacity-80 transition-opacity cursor-pointer truncate"
                        style={{ backgroundColor: `${color}20` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppointment(app);
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-muted-foreground">{time}</span>
                        <span className="truncate font-medium text-foreground">
                          {customerName}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[10px] text-primary font-medium px-1">
                      +{overflow} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
