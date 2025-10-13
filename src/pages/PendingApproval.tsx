import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const PendingApproval = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Noch nicht freigeschaltet
          </CardTitle>
          <CardDescription>
            Ihr Konto muss von einem Administrator freigeschaltet werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dein Konto wurde registriert. Ein Administrator muss dich freischalten, 
            bevor du auf das System zugreifen kannst. Bitte warte oder kontaktiere den Administrator.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
