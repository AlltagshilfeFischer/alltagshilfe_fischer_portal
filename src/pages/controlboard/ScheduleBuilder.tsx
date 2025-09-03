import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Building2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, addDays, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Dummy data for demonstration - in real app these would be appointments from database
const dummyEmployees = [
  { id: '1', vorname: 'Max', nachname: 'Mustermann', ist_aktiv: true, max_termine_pro_tag: 8, position: 0 },
  { id: '2', vorname: 'Anna', nachname: 'Schmidt', ist_aktiv: true, max_termine_pro_tag: 6, position: 1 },
  { id: '3', vorname: 'Tom', nachname: 'Weber', ist_aktiv: true, max_termine_pro_tag: 7, position: 2 },
];

// These are actually appointments (Termine) with customers but no assigned employee
const dummyOpenAppointments = [
  { id: 'a1', titel: 'Hausbesuch Familie Müller', startzeit: '08:00', endzeit: '10:00', datum: '2025-09-03', kunde: 'Familie Müller' },
  { id: 'a2', titel: 'Beratung Herr Schmidt', startzeit: '14:00', endzeit: '15:30', datum: '2025-09-03', kunde: 'Herr Schmidt' },
  { id: 'a3', titel: 'Nachkontrolle Frau Weber', startzeit: '09:00', endzeit: '11:00', datum: '2025-09-04', kunde: 'Frau Weber' },
  { id: 'a4', titel: 'Erstberatung Familie Klein', startzeit: '16:00', endzeit: '17:00', datum: '2025-09-04', kunde: 'Familie Klein' },
  { id: 'a5', titel: 'Therapie Herr Fischer', startzeit: '10:00', endzeit: '12:00', datum: '2025-09-05', kunde: 'Herr Fischer' },
];

export default function ScheduleBuilder() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragType, setDragType] = useState<'employee' | 'appointment' | null>(null);
  const [employees, setEmployees] = useState(dummyEmployees);
  const [assignments, setAssignments] = useState<any[]>([]); // Employee appointment assignments
  const queryClient = useQueryClient();

  // Use dummy data for now - in production this would come from the database
  const openAppointments = dummyOpenAppointments;

  // Generate week dates starting from Monday
  const getWeekDates = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const weekDates = getWeekDates();
  const currentWeekNumber = getWeek(currentWeek, { weekStartsOn: 1 });

  const handleDragStart = (item: any, type: 'employee' | 'appointment') => {
    setDraggedItem(item);
    setDragType(type);
  };

  const handleDrop = (employeeId: string, date: string) => {
    if (draggedItem && dragType === 'appointment') {
      // Assign open appointment to employee
      const newAssignment = {
        id: `assignment-${Date.now()}`,
        employeeId,
        appointmentId: draggedItem.id,
        date,
        appointment: draggedItem
      };
      
      setAssignments(prev => [...prev, newAssignment]);
      
      const employeeName = employees.find(e => e.id === employeeId)?.vorname;
      toast.success(`Termin "${draggedItem.titel}" wurde ${employeeName} zugewiesen`);
      
      setDraggedItem(null);
      setDragType(null);
    }
  };

  const handleEmployeeDrop = (draggedEmployeeId: string, targetEmployeeId: string) => {
    if (draggedEmployeeId === targetEmployeeId) return;
    
    const draggedEmployee = employees.find(e => e.id === draggedEmployeeId);
    const targetEmployee = employees.find(e => e.id === targetEmployeeId);
    
    if (draggedEmployee && targetEmployee) {
      const newEmployees = employees.map(emp => {
        if (emp.id === draggedEmployeeId) {
          return { ...emp, position: targetEmployee.position };
        }
        if (emp.id === targetEmployeeId) {
          return { ...emp, position: draggedEmployee.position };
        }
        return emp;
      });
      
      setEmployees(newEmployees.sort((a, b) => a.position - b.position));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' ? addDays(currentWeek, -7) : addDays(currentWeek, 7));
  };

  const getAppointmentCount = (employeeId: string) => {
    return assignments.filter(a => a.employeeId === employeeId).length;
  };

  const getAppointmentsForDate = (date: string) => {
    const assignedAppointmentIds = assignments.map(a => a.appointmentId);
    return openAppointments.filter(appointment => 
      appointment.datum === date && !assignedAppointmentIds.includes(appointment.id)
    );
  };

  const getAssignmentsForEmployeeAndDate = (employeeId: string, date: string) => {
    return assignments.filter(a => a.employeeId === employeeId && a.date === date);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">2025</h1>
          <h2 className="text-xl text-muted-foreground">September</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Schedule Layout */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Left Sidebar with Employees */}
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white bg-blue-500 px-2 py-1 rounded">
                ÜBERSICHT
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              <div className="text-xs">
                <div className="flex justify-between">
                  <span>Offene Termine:</span>
                  <span className="font-medium">{openAppointments.filter(a => !assignments.some(assign => assign.appointmentId === a.id)).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Zugewiesene Termine:</span>
                  <span className="font-medium">{assignments.length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-3 w-3 mr-1" />
                Neuer Termin
              </Button>
            </CardContent>
          </Card>

          {/* Employees Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white bg-orange-500 px-2 py-1 rounded">
                MITARBEITER
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              {employees.sort((a, b) => a.position - b.position).map((employee) => {
                const appointmentCount = getAppointmentCount(employee.id);
                return (
                  <div 
                    key={employee.id} 
                    className="space-y-1 p-2 rounded cursor-move hover:bg-muted/20 transition-colors"
                    draggable
                    onDragStart={() => handleDragStart(employee, 'employee')}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem && dragType === 'employee' && draggedItem.id !== employee.id) {
                        handleEmployeeDrop(draggedItem.id, employee.id);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="font-medium text-sm">
                      {employee.vorname} {employee.nachname}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appointmentCount} Termine
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {/* Week Header with Open Appointments */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 text-xs text-muted-foreground border-r">
                KW {currentWeekNumber}
              </div>
              {weekDates.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dayAppointments = getAppointmentsForDate(dateStr);
                return (
                  <div key={index} className="p-2 border-r last:border-r-0">
                    <div className="text-center mb-2">
                      <div className="text-xs text-muted-foreground">
                        {WEEKDAYS[index]}
                      </div>
                      <div className="text-sm font-medium">
                        {format(date, 'd')}
                      </div>
                    </div>
                    {/* Open appointments for this day */}
                    <div className="space-y-1 min-h-[60px]">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          draggable
                          onDragStart={() => handleDragStart(appointment, 'appointment')}
                          className="p-1 bg-orange-100 text-orange-800 rounded text-xs cursor-move hover:bg-orange-200 transition-colors"
                        >
                          <div className="font-medium text-xs">{appointment.titel}</div>
                          <div className="text-xs opacity-75">{appointment.startzeit}-{appointment.endzeit}</div>
                          <div className="text-xs opacity-75">{appointment.kunde}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Employee Rows */}
            {employees.sort((a, b) => a.position - b.position).map((employee) => (
              <div key={employee.id} className="grid grid-cols-8 border-b last:border-b-0">
                <div 
                  className="p-3 border-r bg-muted/30 cursor-move hover:bg-muted/50 transition-colors"
                  draggable
                  onDragStart={() => handleDragStart(employee, 'employee')}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedItem && dragType === 'employee' && draggedItem.id !== employee.id) {
                      handleEmployeeDrop(draggedItem.id, employee.id);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="font-medium text-sm">
                    {employee.vorname}
                  </div>
                  <div className="font-medium text-sm">
                    {employee.nachname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getAppointmentCount(employee.id)} Termine
                  </div>
                </div>
                {weekDates.map((date, dayIndex) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <div
                      key={dayIndex}
                      className="min-h-[80px] p-2 border-r last:border-r-0 hover:bg-muted/20 transition-colors"
                      onDrop={() => handleDrop(employee.id, dateStr)}
                      onDragOver={handleDragOver}
                    >
                      {/* Display assigned appointments */}
                      {getAssignmentsForEmployeeAndDate(employee.id, dateStr).map((assignment) => (
                        <div key={assignment.id} className="mb-1 p-1 bg-green-100 text-green-800 rounded text-xs">
                          <div className="font-medium">{assignment.appointment.titel}</div>
                          <div className="text-xs">{assignment.appointment.startzeit} - {assignment.appointment.endzeit}</div>
                          <div className="text-xs opacity-75">{assignment.appointment.kunde}</div>
                        </div>
                      ))}
                      {getAssignmentsForEmployeeAndDate(employee.id, dateStr).length === 0 && (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                          Termin hier zuweisen
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertDescription>
          <strong>Dienstplan-Funktionen:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Ziehen Sie offene Termine aus der Tagesübersicht auf Mitarbeiter-Zeitslots</li>
            <li>Mitarbeiter können per Drag & Drop umsortiert werden</li>
            <li>Jeder Termin hat einen festen Kunden und kann einem Mitarbeiter zugewiesen werden</li>
            <li>Termine ohne Mitarbeiter werden als "offene Termine" angezeigt</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}