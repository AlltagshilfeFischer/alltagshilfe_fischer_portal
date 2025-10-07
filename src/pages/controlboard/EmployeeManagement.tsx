import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';

export default function EmployeeManagement() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    vorname: '',
    nachname: '',
    telefon: '',
    farbe_kalender: '#3B82F6',
    max_termine_pro_tag: '',
    soll_wochenstunden: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          email: formData.email,
          password: formData.password,
          vorname: formData.vorname || undefined,
          nachname: formData.nachname || undefined,
          telefon: formData.telefon || undefined,
          farbe_kalender: formData.farbe_kalender,
          max_termine_pro_tag: formData.max_termine_pro_tag ? parseInt(formData.max_termine_pro_tag) : undefined,
          soll_wochenstunden: formData.soll_wochenstunden ? parseFloat(formData.soll_wochenstunden) : undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Mitarbeiter angelegt',
          description: `Mitarbeiter ${formData.email} wurde erfolgreich angelegt.`,
        });
        // Reset form
        setFormData({
          email: '',
          password: '',
          vorname: '',
          nachname: '',
          telefon: '',
          farbe_kalender: '#3B82F6',
          max_termine_pro_tag: '',
          soll_wochenstunden: '',
        });
      } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      console.error('Create employee error:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Fehler beim Anlegen des Mitarbeiters',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mitarbeiter-Verwaltung</h1>
        <p className="text-muted-foreground">Neue Mitarbeiter direkt anlegen</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Neuen Mitarbeiter anlegen
          </CardTitle>
          <CardDescription>
            Erstellen Sie einen neuen Mitarbeiter-Account mit Login-Zugang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  E-Mail-Adresse <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mitarbeiter@beispiel.de"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Passwort <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input
                  id="vorname"
                  type="text"
                  placeholder="Max"
                  value={formData.vorname}
                  onChange={(e) => handleChange('vorname', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname</Label>
                <Input
                  id="nachname"
                  type="text"
                  placeholder="Mustermann"
                  value={formData.nachname}
                  onChange={(e) => handleChange('nachname', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  type="tel"
                  placeholder="+49 123 456789"
                  value={formData.telefon}
                  onChange={(e) => handleChange('telefon', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="farbe_kalender">Kalenderfarbe</Label>
                <Input
                  id="farbe_kalender"
                  type="color"
                  value={formData.farbe_kalender}
                  onChange={(e) => handleChange('farbe_kalender', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_termine_pro_tag">Max. Termine pro Tag</Label>
                <Input
                  id="max_termine_pro_tag"
                  type="number"
                  placeholder="z.B. 8"
                  min="1"
                  value={formData.max_termine_pro_tag}
                  onChange={(e) => handleChange('max_termine_pro_tag', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="soll_wochenstunden">Soll-Wochenstunden</Label>
                <Input
                  id="soll_wochenstunden"
                  type="number"
                  placeholder="z.B. 40"
                  min="0"
                  step="0.5"
                  value={formData.soll_wochenstunden}
                  onChange={(e) => handleChange('soll_wochenstunden', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird angelegt...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Mitarbeiter anlegen
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}