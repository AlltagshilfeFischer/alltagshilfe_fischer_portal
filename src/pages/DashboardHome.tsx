import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function DashboardHome() {
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

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Übersicht über alle Mitarbeiter und Kunden
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Mitarbeiter</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employeesLoading ? '-' : employees?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registrierte Mitarbeiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customersLoading ? '-' : customers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registrierte Kunden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mitarbeiter
          </CardTitle>
          <CardDescription>
            Alle aktiven Mitarbeiter im System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesLoading || profilesLoading ? (
            <div className="text-center py-4">Lade Mitarbeiter...</div>
          ) : employees && employees.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => {
                const profile = profiles?.find(p => p.user_id === employee.user_id);
                return (
                  <div
                    key={employee.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {employee.position || 'Keine Position angegeben'}
                    </div>
                    {employee.employee_number && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Nr: {employee.employee_number}
                      </div>
                    )}
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

      {/* Kunden Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Kunden
          </CardTitle>
          <CardDescription>
            Alle registrierten Kunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <div className="text-center py-4">Lade Kunden...</div>
          ) : customers && customers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </div>
                  {customer.address && (
                    <div className="text-sm text-muted-foreground">
                      {customer.address}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Tel: {customer.phone}
                    </div>
                  )}
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
  );
}