import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Shield, Users, Clock, FileText } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect to dashboard if already authenticated
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Clock,
      title: 'Zeiterfassung',
      description: 'Erfassen Sie Ihre Arbeitszeiten einfach und präzise.',
    },
    {
      icon: Users,
      title: 'Kundenverwaltung',
      description: 'Verwalten Sie Ihre Kunden und deren Informationen zentral.',
    },
    {
      icon: FileText,
      title: 'Berichtswesen',
      description: 'Erstellen Sie professionelle Berichte für Ihre Arbeit.',
    },
    {
      icon: Shield,
      title: 'Sicherheit',
      description: 'Ihre Daten sind bei uns sicher und DSGVO-konform.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">AH</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Alltagshilfe Fischer</h1>
              <p className="text-sm text-muted-foreground">Mitarbeiterportal</p>
            </div>
          </div>
          <Button asChild className="bg-primary hover:bg-primary-hover">
            <a href="/auth">
              Anmelden
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Willkommen im
            <span className="text-primary block">Control Board</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Ihr zentrales Portal für Dienstplanung, Zeiterfassung und Kundenverwaltung.
            Einfach, sicher und effizient.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-hover">
              <a href="/auth">
                Jetzt anmelden
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Funktionen</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Alles was Sie für Ihre tägliche Arbeit benötigen, übersichtlich und einfach zu bedienen.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card border-t">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Bereit anzufangen?</h2>
          <p className="text-muted-foreground mb-6">
            Melden Sie sich an und starten Sie mit der Verwaltung Ihrer Alltagshilfe.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary-hover">
            <a href="/auth">
              Zum Control Board
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
