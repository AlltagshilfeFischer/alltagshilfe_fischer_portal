import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Calendar, Clock, Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const statsCards = [
  {
    title: 'Heute geplant',
    value: '8',
    description: 'Termine',
    icon: Calendar,
    color: 'text-blue-600',
  },
  {
    title: 'Arbeitszeit',
    value: '7.5h',
    description: 'Heute erfasst',
    icon: Clock,
    color: 'text-green-600',
  },
  {
    title: 'Aktive Kunden',
    value: '24',
    description: 'Diese Woche',
    icon: Users,
    color: 'text-purple-600',
  },
  {
    title: 'Offene Berichte',
    value: '3',
    description: 'Zu erledigen',
    icon: FileText,
    color: 'text-orange-600',
  },
];

const todaySchedule = [
  {
    time: '08:00',
    client: 'Maria Müller',
    task: 'Körperpflege & Anziehen',
    status: 'completed',
    duration: '45 min',
  },
  {
    time: '09:30',
    client: 'Hans Schmidt',
    task: 'Einkauf & Haushaltsführung',
    status: 'completed',
    duration: '90 min',
  },
  {
    time: '12:00',
    client: 'Anna Weber',
    task: 'Mittagessen & Medikamente',
    status: 'current',
    duration: '60 min',
  },
  {
    time: '14:00',
    client: 'Fritz Bauer',
    task: 'Spaziergang & Begleitung',
    status: 'pending',
    duration: '45 min',
  },
  {
    time: '16:30',
    client: 'Gerta Hoffmann',
    task: 'Körperpflege & Abendessen',
    status: 'pending',
    duration: '75 min',
  },
];

export default function Dashboard() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Erledigt</Badge>;
      case 'current':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Aktuell</Badge>;
      case 'pending':
        return <Badge variant="outline">Ausstehend</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Übersicht</h1>
          <p className="text-muted-foreground">
            Hier finden Sie eine Zusammenfassung Ihrer heutigen Aktivitäten
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Heutiger Dienstplan
            </CardTitle>
            <CardDescription>
              Ihre geplanten Termine für heute, {new Date().toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaySchedule.map((appointment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(appointment.status)}
                    <div>
                      <div className="font-medium">{appointment.time}</div>
                      <div className="text-sm text-muted-foreground">{appointment.duration}</div>
                    </div>
                    <div>
                      <div className="font-medium">{appointment.client}</div>
                      <div className="text-sm text-muted-foreground">{appointment.task}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(appointment.status)}
                    {appointment.status === 'current' && (
                      <Button size="sm" className="bg-primary hover:bg-primary-hover">
                        Jetzt starten
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellaktionen</CardTitle>
            <CardDescription>
              Häufig verwendete Funktionen für den schnellen Zugriff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button className="h-20 flex flex-col gap-2 bg-primary hover:bg-primary-hover">
                <Clock className="h-6 w-6" />
                <span>Zeit erfassen</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>Bericht erstellen</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>Kunden verwalten</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}