import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

// Platzhalter-URL für die Landing Page - später durch echte URL ersetzen
const LANDING_PAGE_URL = 'https://alltagshilfe-fischer.de';

const AuthPage = () => {
  const { signIn, resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      let errorMessage = error.message;
      
      // Benutzerfreundliche Fehlermeldungen auf Deutsch
      if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Prüfen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink.';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'E-Mail oder Passwort ist falsch.';
      }
      
      toast({
        title: "Fehler beim Anmelden",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };


  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-Mail versendet",
        description: "Prüfen Sie Ihren Posteingang für den Passwort-Reset-Link.",
      });
      setShowPasswordReset(false);
      setShowPasswordReset(false);
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <a 
            href={LANDING_PAGE_URL}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Website
          </a>
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/lovable-uploads/891b224f-e6be-40c4-bfcb-acf04320f118.png" 
              alt="Alltagshilfe Fischer Logo" 
              className="h-10 w-10 object-contain"
            />
            <CardTitle>Alltagshilfe Fischer Portal</CardTitle>
          </div>
          <CardDescription>
            Melden Sie sich mit Ihren Zugangsdaten an
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showPasswordReset ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Passwort zurücksetzen</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPasswordReset(false)}
                >
                  Zurück
                </Button>
              </div>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-Mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Wird gesendet..." : "Passwort zurücksetzen"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Sie erhalten eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
                </p>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                  >
                    Passwort vergessen?
                  </button>
                </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
