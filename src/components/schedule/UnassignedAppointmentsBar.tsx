import React, { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { DraggableAppointment } from './DraggableAppointment';
import type { CalendarAppointment } from '@/types/domain';

interface UnassignedAppointmentsBarProps {
  appointments: CalendarAppointment[];
  weekDates: Date[];
  activeId: string | null;
  onEditAppointment: (appointment: CalendarAppointment) => void;
  onCut?: (appointment: CalendarAppointment) => void;
  onCopy?: (appointment: CalendarAppointment) => void;
  onSlotClick?: (date: Date) => void;
  viewMode?: 'week' | 'month';
  currentDay?: Date;
}

export function UnassignedAppointmentsBar({
  appointments,
  activeId,
  onEditAppointment,
  onCut,
  onCopy,
}: UnassignedAppointmentsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const unassignedAppointments = React.useMemo(() => {
    return appointments
      .filter(app => !app.mitarbeiter_id)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [appointments]);

  const totalUnassigned = unassignedAppointments.length;
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' });

  // Beim Draggen automatisch aufklappen
  const showContent = isExpanded || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b transition-colors flex-shrink-0",
        isOver && "bg-amber-50 dark:bg-amber-950/30 border-amber-300"
      )}
    >
      {/* Kompakter Header — klickbar zum Ein-/Ausklappen */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1 w-full text-left bg-background hover:bg-muted/50 transition-colors"
      >
        {showContent
          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground" />
        }
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        <span className="text-[11px] font-medium">Unzugeordnet</span>
        {totalUnassigned > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{totalUnassigned}</Badge>
        )}
        {isOver && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-1 animate-pulse">
            Loslassen → Zuordnung entfernen
          </span>
        )}
      </button>

      {/* Inhalt — nur sichtbar wenn aufgeklappt oder Drag-Over */}
      {showContent && (
        totalUnassigned > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 px-3 py-1.5">
              {unassignedAppointments.map((appointment) => (
                <div key={appointment.id} className="flex-shrink-0 w-36">
                  <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mb-0.5 px-0.5">
                    <Clock className="h-2 w-2" />
                    {format(new Date(appointment.start_at), 'EEE dd.MM. HH:mm', { locale: de })}
                  </div>
                  <DraggableAppointment
                    appointment={appointment}
                    isDragging={activeId === appointment.id}
                    isConflicting={false}
                    onClick={() => onEditAppointment(appointment)}
                    onCut={() => onCut?.(appointment)}
                    onCopy={() => onCopy?.(appointment)}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className={cn(
            "h-8 flex items-center justify-center text-[11px] text-muted-foreground/50 mx-3 my-1 rounded border border-dashed border-muted-foreground/20 transition-colors",
            isOver && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600"
          )}>
            {isOver ? 'Loslassen zum Entfernen' : 'Keine unzugeordneten Termine'}
          </div>
        )
      )}
    </div>
  );
}
