import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DraggableAppointment } from './DraggableAppointment';

interface Customer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
}

interface Appointment {
  id: string;
  titel: string;
  kunden_id: string;
  mitarbeiter_id: string | null;
  start_at: string;
  end_at: string;
  customer?: Customer;
}

interface UnassignedAppointmentsBarProps {
  appointments: Appointment[];
  weekDates: Date[];
  activeId: string | null;
  onEditAppointment: (appointment: Appointment) => void;
}

export function UnassignedAppointmentsBar({
  appointments,
  weekDates,
  activeId,
  onEditAppointment
}: UnassignedAppointmentsBarProps) {
  // Group unassigned appointments by date
  const groupedAppointments = React.useMemo(() => {
    const groups: { [key: string]: Appointment[] } = {};
    
    appointments
      .filter(app => !app.mitarbeiter_id)
      .forEach(appointment => {
        const dateKey = format(new Date(appointment.start_at), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(appointment);
      });
    
    return groups;
  }, [appointments]);

  const totalUnassigned = appointments.filter(app => !app.mitarbeiter_id).length;

  if (totalUnassigned === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-warning bg-gradient-to-r from-warning/10 to-orange-50 shadow-md">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-medium text-warning-foreground">Unzugeordnete Termine</h3>
            <Badge variant="destructive" className="bg-warning text-warning-foreground text-xs">
              {totalUnassigned}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Termine ohne Mitarbeiter - Per Drag & Drop zuordnen
          </div>
        </div>

        {/* Grid matching calendar days */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${weekDates.length}, 1fr)` }}>
          {/* Empty space for employee column */}
          <div className="bg-muted/30 rounded p-2">
            <div className="text-xs font-medium text-muted-foreground">Mitarbeiter</div>
          </div>
          
          {/* Date headers */}
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="text-center bg-muted/20 rounded p-1">
              <div className="text-xs font-medium text-muted-foreground">
                {format(date, 'EEE', { locale: de })}
              </div>
              <div className="text-xs font-semibold text-foreground">
                {format(date, 'dd.MM')}
              </div>
            </div>
          ))}

          {/* Empty space for employee column */}
          <div></div>

          {/* Appointments for each day */}
          {weekDates.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dayAppointments = groupedAppointments[dateKey] || [];

            return (
              <div key={dateKey} className="min-h-[50px] space-y-1">
                {dayAppointments.length > 0 ? (
                  dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="relative group"
                    >
                      <Card 
                        className={cn(
                          "p-2 cursor-pointer border border-warning/30 bg-background hover:bg-warning/5 transition-all duration-200",
                          "shadow-sm hover:shadow-md hover:border-warning/50",
                          activeId === appointment.id && "ring-2 ring-warning"
                        )}
                        onClick={() => onEditAppointment(appointment)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-warning" />
                            <span className="text-xs font-medium text-warning-foreground truncate">
                              Ohne Mitarbeiter
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-foreground truncate">
                            {appointment.titel}
                          </div>
                          {appointment.customer && (
                            <div className="text-xs text-muted-foreground truncate">
                              {appointment.customer.vorname} {appointment.customer.nachname}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(appointment.start_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground opacity-60">
                    -
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}