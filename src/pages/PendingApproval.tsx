import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, CheckCircle, AlertCircle } from 'lucide-react';

type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'not_found';

const PendingApproval = () => {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      // Check email confirmation status from auth user
      setEmailConfirmed(!!user.email_confirmed_at);

      // Check pending_registrations status
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('status')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking registration status:', error);
        setStatus('not_found');
      } else if (data) {
        setStatus(data.status as RegistrationStatus);
      } else {
        setStatus('not_found');
      }
      
      setLoading(false);
    };

    checkStatus();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Email not confirmed yet
  if (!emailConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              E-Mail bestätigen
            </CardTitle>
            <CardDescription>
              Bitte bestätigen Sie Ihre E-Mail-Adresse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wir haben Ihnen eine E-Mail an <strong>{user?.email}</strong> gesendet. 
              Bitte klicken Sie auf den Bestätigungslink in der E-Mail, um Ihre Registrierung fortzusetzen.
            </p>
            <p className="text-sm text-muted-foreground">
              Nach der E-Mail-Bestätigung muss ein Administrator Ihren Zugang freischalten.
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration rejected
  if (status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Registrierung abgelehnt
            </CardTitle>
            <CardDescription>
              Ihre Registrierung wurde leider nicht genehmigt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ein Administrator hat Ihre Registrierungsanfrage abgelehnt. 
              Bitte kontaktieren Sie den Administrator für weitere Informationen.
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for admin approval (pending status or approved email but not in benutzer)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Warte auf Freischaltung
          </CardTitle>
          <CardDescription>
            Ihr Konto muss von einem Administrator freigeschaltet werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            E-Mail bestätigt
          </div>
          <p className="text-sm text-muted-foreground">
            Ihre E-Mail-Adresse wurde bestätigt. Ein Administrator muss nun Ihren Zugang freischalten, 
            bevor Sie auf das System zugreifen können.
          </p>
          <p className="text-sm text-muted-foreground">
            Sie werden automatisch weitergeleitet, sobald Ihr Konto freigeschaltet wurde. 
            Bitte laden Sie diese Seite später erneut.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.reload()} 
              variant="default" 
              className="flex-1"
            >
              Status prüfen
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="flex-1">
              Abmelden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
