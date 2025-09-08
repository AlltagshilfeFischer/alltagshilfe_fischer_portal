import { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, ChevronLeft, ChevronRight, User, Clock, AlertTriangle, Users, Calendar, TrendingUp, Filter, Search, Eye, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppointmentApprovalDialog } from '@/components/schedule/AppointmentApprovalDialog';

interface Employee {
  id: string;
  vorname: string;
  nachname: string;
  name: string;
  email: string;
  telefon: string;
  ist_aktiv: boolean;
  max_termine_pro_tag: number;
  farbe_kalender: string;
  workload: number;
}

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
  status: 'unassigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  customer?: Customer;
  employee?: Employee;
}

const ScheduleBuilder = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchAppointment, setSearchAppointment] = useState('');
  const [sortEmployees, setSortEmployees] = useState('name');
  const [filterPriority, setFilterPriority] = useState('all');
  const [viewMode, setViewMode] = useState('week');
  
  // Real data from Supabase
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
  const { toast } = useToast();

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('mitarbeiter')
        .select('*')
        .order('vorname');
      
      if (employeesError) throw employeesError;

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('kunden')
        .select('*')
        .eq('aktiv', true)
        .order('vorname');
      
      if (customersError) throw customersError;

      // Load appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('termine')
        .select(`
          *,
          customer:kunden(*),
          employee:mitarbeiter(*)
        `)
        .order('start_at');
      
      if (appointmentsError) throw appointmentsError;

      // Load pending changes
      const { data: changesData, error: changesError } = await supabase
        .from('termin_aenderungen')
        .select(`
          *,
          requester:benutzer!termin_aenderungen_requested_by_fkey(*),
          old_customer:kunden!termin_aenderungen_old_kunden_id_fkey(*),
          new_customer:kunden!termin_aenderungen_new_kunden_id_fkey(*),
          old_employee:mitarbeiter!termin_aenderungen_old_mitarbeiter_id_fkey(*),
          new_employee:mitarbeiter!termin_aenderungen_new_mitarbeiter_id_fkey(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (changesError) throw changesError;

      // Transform employees data
      const transformedEmployees = employeesData?.map(emp => ({
        ...emp,
        name: `${emp.vorname} ${emp.nachname}`,
        workload: Math.floor(Math.random() * 40) + 60, // Mock workload for now
      })) || [];

      // Transform appointments data to match our interface
      const transformedAppointments = appointmentsData?.map(app => ({
        ...app,
        customer: app.customer as Customer,
        employee: app.employee ? {
          ...app.employee,
          name: `${app.employee.vorname} ${app.employee.nachname}`,
          workload: Math.floor(Math.random() * 40) + 60,
        } : undefined,
      })) || [];

      setEmployees(transformedEmployees);
      setCustomers(customersData || []);
      setAppointments(transformedAppointments);
      setPendingChanges(changesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => 
        emp.ist_aktiv && 
        emp.name.toLowerCase().includes(searchEmployee.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortEmployees) {
          case 'workload':
            return b.workload - a.workload;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [employees, searchEmployee, sortEmployees]);

  const openAppointments = useMemo(() => {
    return appointments.filter(app => app.status === 'unassigned');
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return openAppointments.filter(app => {
      const matchesSearch = app.titel.toLowerCase().includes(searchAppointment.toLowerCase());
      return matchesSearch;
    });
  }, [openAppointments, searchAppointment]);

  const getWeekDates = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const handleDragStart = (item: any, type: string) => {
    setDraggedItem(item);
  };

  const handleDrop = (employeeId: string, dayIndex: number) => {
    if (draggedItem) {
      // Here you would implement the appointment assignment logic
      toast({
        title: 'Erfolg',
        description: `Termin "${draggedItem.titel}" wurde zugewiesen.`,
      });
      setDraggedItem(null);
    }
  };

  const handleDropToOpenShifts = () => {
    if (draggedItem) {
      toast({
        title: 'Erfolg',
        description: 'Termin wurde zu offenen Schichten verschoben.',
      });
      setDraggedItem(null);
    }
  };

  const handleEmployeeDrop = (draggedId: string, targetId: string) => {
    // Implement employee reordering logic
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
  };

  const getAppointmentCount = (employeeId: string, day: number) => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const targetDate = addDays(weekStart, day);
    
    return appointments.filter(app => {
      if (app.mitarbeiter_id !== employeeId) return false;
      const appDate = new Date(app.start_at);
      return appDate.toDateString() === targetDate.toDateString();
    }).length;
  };

  const getAppointmentsForDate = (employeeId: string, day: number) => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const targetDate = addDays(weekStart, day);
    
    return appointments.filter(app => {
      if (app.mitarbeiter_id !== employeeId) return false;
      const appDate = new Date(app.start_at);
      return appDate.toDateString() === targetDate.toDateString();
    });
  };

  const getWorkloadStatus = (workload: number) => {
    if (workload >= 90) return { color: 'bg-red-500', text: 'Überlastet' };
    if (workload >= 80) return { color: 'bg-orange-500', text: 'Hoch' };
    if (workload >= 60) return { color: 'bg-yellow-500', text: 'Normal' };
    return { color: 'bg-green-500', text: 'Niedrig' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dienstplanmanagement</h1>
          <p className="text-muted-foreground">
            KW {format(currentWeek, 'w')} • {format(currentWeek, 'MMMM yyyy', { locale: de })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Heute
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offene Termine</p>
                <p className="text-2xl font-bold">{openAppointments.length}</p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zugeteilte Termine</p>
                <p className="text-2xl font-bold">{appointments.filter(a => a.status !== 'unassigned').length}</p>
              </div>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktive Mitarbeiter</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.ist_aktiv).length}</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Heute geplant</p>
                <p className="text-2xl font-bold">{appointments.filter(a => {
                  const today = new Date();
                  const appDate = new Date(a.start_at);
                  return appDate.toDateString() === today.toDateString() && a.status === 'scheduled';
                }).length}</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ausstehende Genehmigungen</p>
                <p className="text-2xl font-bold">{pendingChanges.length}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApprovalDialog(true)}
                className="p-0 h-auto"
                disabled={pendingChanges.length === 0}
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Employees */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Mitarbeiter</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Suchen..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="w-24 h-8 text-xs"
                  />
                  <Select value={sortEmployees} onValueChange={setSortEmployees}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nach Name</SelectItem>
                      <SelectItem value="workload">Nach Auslastung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-3 border rounded-lg cursor-move hover:bg-muted/50 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(employee, 'employee')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: employee.farbe_kalender }}
                        />
                        <span className="font-medium">{employee.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {employee.email}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Auslastung</span>
                          <span>{employee.workload}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={cn("h-1.5 rounded-full", getWorkloadStatus(employee.workload).color)}
                            style={{ width: `${employee.workload}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      Max. {employee.max_termine_pro_tag || 8} Termine/Tag
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Open Appointments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Offene Termine</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Suchen..."
                    value={searchAppointment}
                    onChange={(e) => setSearchAppointment(e.target.value)}
                    className="w-24 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className="min-h-[200px] border-2 border-dashed border-muted rounded-lg p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropToOpenShifts}
              >
                <div className="space-y-2">
                  {filteredAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-3 rounded-lg border cursor-move transition-colors border-orange-300 bg-orange-50"
                      draggable
                      onDragStart={(e) => {
                        setDraggedItem(appointment);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{appointment.titel}</span>
                        <Badge variant="secondary">
                          Unzugewiesen
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {appointment.customer?.vorname} {appointment.customer?.nachname}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(appointment.start_at), 'dd.MM.yyyy HH:mm')} - {format(new Date(appointment.end_at), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Wochenplan</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week Headers */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="p-2 text-sm font-medium">Mitarbeiter</div>
              {getWeekDates().map((date, index) => (
                <div key={index} className="p-2 text-center">
                  <div className="text-xs font-medium">
                    {format(date, 'EEE', { locale: de })}
                  </div>
                  <div className="text-lg font-bold">
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mb-4" />

            {/* Employee Rows */}
            <div className="space-y-2">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="grid grid-cols-8 gap-2 items-center">
                  <div className="p-2 flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: employee.farbe_kalender }}
                    />
                    <span className="text-sm font-medium">{employee.name}</span>
                  </div>
                  
                  {getWeekDates().map((date, dayIndex) => {
                    const appointmentCount = getAppointmentCount(employee.id, dayIndex);
                    const dayAppointments = getAppointmentsForDate(employee.id, dayIndex);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "min-h-[60px] border border-dashed border-gray-300 rounded p-2",
                          "hover:bg-gray-50 transition-colors cursor-pointer",
                          appointmentCount >= (employee.max_termine_pro_tag || 8) && "bg-red-100 border-red-300"
                        )}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedItem) {
                            handleDrop(employee.id, dayIndex);
                          }
                        }}
                      >
                        {dayAppointments.map((app) => (
                          <div key={app.id} className="mb-1 p-1 bg-blue-50 rounded text-xs">
                            {app.titel} ({format(new Date(app.start_at), 'HH:mm')})
                          </div>
                        ))}
                        {appointmentCount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {appointmentCount} Termine
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {editingAppointment && (
        <Dialog open={!!editingAppointment} onOpenChange={() => setEditingAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Termin bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titel</label>
                <div className="text-sm">{editingAppointment.titel}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Geplant</SelectItem>
                    <SelectItem value="completed">Abgeschlossen</SelectItem>
                    <SelectItem value="cancelled">Abgesagt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setEditingAppointment(null)}>
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AppointmentApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => setShowApprovalDialog(false)}
        changes={pendingChanges}
        onApprovalAction={() => {
          loadData();
          setShowApprovalDialog(false);
        }}
      />
    </div>
  );
};

export default ScheduleBuilder;