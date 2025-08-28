import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export default function ScheduleBuilder() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('last_name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', selectedDate)
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
  });

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const getEmployeeName = (userId: string) => {
    const profile = profiles?.find(p => p.user_id === userId);
    return profile ? `${profile.first_name} ${profile.last_name}` : 'Unbekannt';
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer ? `${customer.first_name} ${customer.last_name}` : 'Unbekannt';
  };

  const handleDragStart = (e: React.DragEvent, employee: any) => {
    e.dataTransfer.setData('employee', JSON.stringify(employee));
  };

  const handleDrop = (e: React.DragEvent, customer: any, timeSlot: string) => {
    e.preventDefault();
    const employeeData = JSON.parse(e.dataTransfer.getData('employee'));
    
    // Hier würde normalerweise ein Termin erstellt werden
    console.log('Termin erstellen:', {
      employee: employeeData,
      customer: customer,
      date: selectedDate,
      time: timeSlot
    });
    
    // TODO: Implementiere die Termin-Erstellung
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dienstplan erstellen</h1>
        <p className="text-muted-foreground">
          Ziehen Sie Mitarbeiter per Drag & Drop zu den Kunden-Zeitslots
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datum auswählen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Mitarbeiter Liste */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Verfügbare Mitarbeiter
              </CardTitle>
              <CardDescription>
                Ziehen Sie Mitarbeiter zu den Zeitslots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="text-center py-4">Lade Mitarbeiter...</div>
              ) : employees && employees.length > 0 ? (
                <div className="space-y-2">
                  {employees.map((employee) => {
                    const profile = profiles?.find(p => p.user_id === employee.user_id);
                    return (
                      <div
                        key={employee.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, employee)}
                        className="p-3 border rounded-lg cursor-move hover:bg-accent/50 transition-colors"
                      >
                        <div className="font-medium">
                          {profile?.first_name} {profile?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.position || 'Mitarbeiter'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Keine Mitarbeiter gefunden
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dienstplan Grid */}
        <div className="lg:col-span-9">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dienstplan für {new Date(selectedDate).toLocaleDateString('de-DE')}
              </CardTitle>
              <CardDescription>
                Bestehende Termine und freie Zeitslots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="text-center py-4">Lade Kunden...</div>
              ) : customers && customers.length > 0 ? (
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="border rounded-lg p-4">
                      <div className="font-medium mb-3">
                        {customer.first_name} {customer.last_name}
                        {customer.address && (
                          <span className="text-sm text-muted-foreground ml-2">
                            - {customer.address}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {timeSlots.map((timeSlot) => {
                          const appointment = appointments?.find(
                            a => a.customer_id === customer.id && a.start_time === timeSlot
                          );
                          
                          return (
                            <div
                              key={timeSlot}
                              onDrop={(e) => handleDrop(e, customer, timeSlot)}
                              onDragOver={handleDragOver}
                              className={`
                                p-2 border rounded text-center text-xs min-h-[60px] flex flex-col justify-center
                                ${appointment 
                                  ? 'bg-primary/10 border-primary/50' 
                                  : 'bg-muted/30 border-dashed border-muted-foreground/30 hover:bg-muted/50'
                                }
                              `}
                            >
                              <div className="font-medium">{timeSlot}</div>
                              {appointment ? (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {getEmployeeName(
                                      employees?.find(e => e.id === appointment.employee_id)?.user_id || ''
                                    )}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="text-muted-foreground">Frei</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Keine Kunden gefunden
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hinweise</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Ziehen Sie Mitarbeiter aus der linken Liste zu den gewünschten Zeitslots</li>
            <li>• Bestehende Termine werden blau hervorgehoben</li>
            <li>• Freie Zeitslots sind gestrichelt dargestellt</li>
            <li>• Die Termin-Erstellung wird in einer zukünftigen Version implementiert</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}