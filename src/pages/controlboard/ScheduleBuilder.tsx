import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

export default function ScheduleBuilder() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch employees with capacity
  const { data: employees } = useQuery({
    queryKey: ['employees-with-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          employee_number,
          position,
          is_active,
          max_appointments_per_day,
          working_days,
          working_hours_start,
          working_hours_end,
          vacation_days
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch profiles separately
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch customers with capacity
  const { data: customers } = useQuery({
    queryKey: ['customers-with-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          address,
          phone,
          email,
          capacity_per_day,
          operating_days,
          operating_hours_start,
          operating_hours_end
        `);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch appointments for current month
  const { data: appointments } = useQuery({
    queryKey: ['monthly-appointments', currentMonth],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          appointment_date,
          start_time,
          end_time,
          employee_id,
          customer_id,
          status
        `)
        .gte('appointment_date', format(start, 'yyyy-MM-dd'))
        .lte('appointment_date', format(end, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data;
    }
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async ({ employeeId, customerId, date, timeSlot }: {
      employeeId: string;
      customerId: string;
      date: string;
      timeSlot: string;
    }) => {
      const [hours] = timeSlot.split(':');
      const endTime = `${(parseInt(hours) + 1).toString().padStart(2, '0')}:00`;
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          employee_id: employeeId,
          customer_id: customerId,
          appointment_date: date,
          start_time: timeSlot,
          end_time: endTime,
          title: 'Termin',
          status: 'scheduled'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-appointments'] });
      toast.success('Termin erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen des Termins');
      console.error('Error creating appointment:', error);
    }
  });

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const handleDragStart = (employee: any) => {
    setDraggedEmployee(employee);
  };

  const handleDrop = (customerId: string, date: string, timeSlot: string) => {
    if (draggedEmployee) {
      createAppointmentMutation.mutate({
        employeeId: draggedEmployee.id,
        customerId,
        date,
        timeSlot
      });
      setDraggedEmployee(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getAppointmentsForDay = (customerId: string, date: string) => {
    return appointments?.filter(apt => 
      apt.customer_id === customerId && 
      apt.appointment_date === date
    ) || [];
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const profile = profiles?.find(p => p.user_id === employee.user_id);
      return profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
    }
    return 'Unknown';
  };

  const getEmployeeCapacityInfo = (employeeId: string, date: string) => {
    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee) return null;

    const employeeAppointments = appointments?.filter(apt => 
      apt.employee_id === employeeId && 
      apt.appointment_date === date
    ) || [];

    const profile = profiles?.find(p => p.user_id === employee.user_id);
    const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';

    return {
      used: employeeAppointments.length,
      max: employee.max_appointments_per_day || 8,
      name
    };
  };

  const isEmployeeAvailable = (employeeId: string, date: string) => {
    const employee = employees?.find(emp => emp.id === employeeId);
    if (!employee) return false;

    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][getDay(new Date(date))];
    const isWorkingDay = employee.working_days?.includes(dayOfWeek) ?? true;
    const isOnVacation = employee.vacation_days?.includes(date) ?? false;

    const employeeAppointments = appointments?.filter(apt => 
      apt.employee_id === employeeId && 
      apt.appointment_date === date
    ) || [];

    const hasCapacity = employeeAppointments.length < (employee.max_appointments_per_day || 8);

    return isWorkingDay && !isOnVacation && hasCapacity;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dienstplan Manager</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Dienstpläne mit Drag & Drop und Kapazitätsmanagement
        </p>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Aktueller Monat
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Planung
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy', { locale: de })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {WEEKDAYS.map(day => (
                  <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayAppointments = appointments?.filter(apt => apt.appointment_date === dateStr) || [];
                  
                  return (
                    <div key={dateStr} className="min-h-[120px] p-2 border rounded-lg">
                      <div className="font-medium text-sm mb-2">{format(date, 'd')}</div>
                      <div className="space-y-1">
                        {dayAppointments.map(apt => (
                          <div key={apt.id} className="bg-primary/10 text-xs p-1 rounded">
                            {apt.start_time} - {getEmployeeName(apt.employee_id)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Available Employees with Capacity */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Mitarbeiter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employees?.map((employee) => {
                  const todayCapacity = getEmployeeCapacityInfo(employee.id, format(new Date(), 'yyyy-MM-dd'));
                  const isAvailable = isEmployeeAvailable(employee.id, format(new Date(), 'yyyy-MM-dd'));
                  
                  return (
                    <div
                      key={employee.id}
                      draggable={isAvailable}
                      onDragStart={() => handleDragStart(employee)}
                      className={`p-3 rounded-lg border transition-colors ${
                        isAvailable 
                          ? 'cursor-move hover:bg-primary/10 bg-background' 
                          : 'opacity-50 cursor-not-allowed bg-muted'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {profiles?.find(p => p.user_id === employee.user_id)?.first_name} {profiles?.find(p => p.user_id === employee.user_id)?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {employee.position || 'Mitarbeiter'}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant={isAvailable ? "default" : "secondary"} className="text-xs">
                          {todayCapacity ? `${todayCapacity.used}/${todayCapacity.max}` : '0/8'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {employee.working_hours_start} - {employee.working_hours_end}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Customer Schedule Grid */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Kundenplanung - {format(new Date(), 'dd.MM.yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-3 bg-muted text-left min-w-[200px]">Kunde</th>
                        {TIME_SLOTS.map(slot => (
                          <th key={slot} className="border p-2 bg-muted text-center min-w-[80px]">
                            {slot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customers?.map((customer) => {
                        const todayStr = format(new Date(), 'yyyy-MM-dd');
                        const customerAppointments = getAppointmentsForDay(customer.id, todayStr);
                        
                        return (
                          <tr key={customer.id}>
                            <td className="border p-3">
                              <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                              <div className="text-sm text-muted-foreground">{customer.address}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Kapazität: {customer.capacity_per_day || 1}/Tag
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {customer.operating_hours_start} - {customer.operating_hours_end}
                                </span>
                              </div>
                            </td>
                            {TIME_SLOTS.map(slot => {
                              const appointment = customerAppointments.find(apt => apt.start_time === slot);
                              const isInOperatingHours = slot >= (customer.operating_hours_start || '08:00') && 
                                                       slot <= (customer.operating_hours_end || '18:00');
                              
                              return (
                                <td
                                  key={slot}
                                  className={`border p-1 h-16 ${!isInOperatingHours ? 'bg-muted/50' : ''}`}
                                  onDrop={() => isInOperatingHours && handleDrop(customer.id, todayStr, slot)}
                                  onDragOver={handleDragOver}
                                >
                                  {appointment ? (
                                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">
                                      <div className="font-medium">
                                        {getEmployeeName(appointment.employee_id)}
                                      </div>
                                    </div>
                                  ) : isInOperatingHours ? (
                                    <div className="h-full bg-muted/30 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
                                      Drop
                                    </div>
                                  ) : (
                                    <div className="h-full bg-muted/70 rounded flex items-center justify-center text-xs text-muted-foreground/50">
                                      Geschlossen
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertDescription>
          <strong>Kapazitätsfunktionen:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Mitarbeiter haben maximale Termine pro Tag und Arbeitszeiten</li>
            <li>Kunden haben Betriebszeiten und Kapazitätslimits</li>
            <li>Drag & Drop nur in verfügbaren Zeitslots möglich</li>
            <li>Echtzeitanzeige der Auslastung pro Mitarbeiter</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}