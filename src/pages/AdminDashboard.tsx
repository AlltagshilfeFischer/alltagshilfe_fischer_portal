import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck, Users } from 'lucide-react';

interface UnactivatedUser {
  user_id: string;
  user_email: string;
  created_at: string;
}

interface Mitarbeiter {
  email: string;
  vorname: string;
  nachname: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [unactivatedUsers, setUnactivatedUsers] = useState<UnactivatedUser[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UnactivatedUser | null>(null);
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    geburtsdatum: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUnactivatedUsers(), loadMitarbeiter()]);
    setLoading(false);
  };

  const loadUnactivatedUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_unactivated_users');
      
      if (error) throw error;
      
      setUnactivatedUsers(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der nicht freigeschalteten User:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der nicht freigeschalteten Benutzer: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const loadMitarbeiter = async () => {
    try {
      const { data, error } = await supabase
        .from('benutzer')
        .select('email, vorname, nachname, created_at')
        .eq('rolle', 'mitarbeiter')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMitarbeiter(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Mitarbeiter: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const openActivationDialog = (user: UnactivatedUser) => {
    setSelectedUser(user);
    setFormData({
      vorname: '',
      nachname: '',
      geburtsdatum: ''
    });
    setActivationDialogOpen(true);
  };

  const handleActivate = async () => {
    if (!selectedUser) return;
    
    setActivating(selectedUser.user_id);
    
    try {
      const { error } = await supabase.rpc('freischalte_mitarbeiter', {
        p_user_id: selectedUser.user_id,
        p_email: selectedUser.user_email,
        p_vorname: formData.vorname || null,
        p_nachname: formData.nachname || null,
        p_geburtsdatum: formData.geburtsdatum || null,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Erfolgreich',
        description: `${selectedUser.user_email} wurde als Mitarbeiter freigeschaltet.`,
      });
      
      setActivationDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Fehler beim Freischalten:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Freischalten: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mitarbeiterverwaltung</h1>
        <p className="text-muted-foreground">Verwalten Sie Benutzer und Mitarbeiter</p>
      </div>

      <Tabs defaultValue="unactivated" className="w-full">
        <TabsList>
          <TabsTrigger value="unactivated" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Nicht freigeschaltet ({unactivatedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="mitarbeiter" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mitarbeiter ({mitarbeiter.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unactivated">
          <Card>
            <CardHeader>
              <CardTitle>Nicht freigeschaltete Benutzer</CardTitle>
              <CardDescription>
                Registrierte Benutzer, die noch nicht freigeschaltet wurden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unactivatedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keine nicht freigeschalteten Benutzer vorhanden
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Registriert am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unactivatedUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.user_email}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openActivationDialog(user)}
                            disabled={activating === user.user_id}
                          >
                            {activating === user.user_id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Wird freigeschaltet...
                              </>
                            ) : (
                              'Als Mitarbeiter freischalten'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitarbeiter">
          <Card>
            <CardHeader>
              <CardTitle>Freigeschaltete Mitarbeiter</CardTitle>
              <CardDescription>
                Alle aktiven Mitarbeiter im System
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mitarbeiter.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keine Mitarbeiter vorhanden
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Vorname</TableHead>
                      <TableHead>Nachname</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mitarbeiter.map((m) => (
                      <TableRow key={m.email}>
                        <TableCell className="font-medium">{m.email}</TableCell>
                        <TableCell>{m.vorname || '-'}</TableCell>
                        <TableCell>{m.nachname || '-'}</TableCell>
                        <TableCell>
                          {new Date(m.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Aktiv</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={activationDialogOpen} onOpenChange={setActivationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter freischalten</DialogTitle>
            <DialogDescription>
              Bitte geben Sie die Informationen für {selectedUser?.user_email} ein.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input
                id="vorname"
                value={formData.vorname}
                onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                placeholder="Vorname eingeben"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nachname">Nachname</Label>
              <Input
                id="nachname"
                value={formData.nachname}
                onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                placeholder="Nachname eingeben"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
              <Input
                id="geburtsdatum"
                type="date"
                value={formData.geburtsdatum}
                onChange={(e) => setFormData({ ...formData, geburtsdatum: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivationDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleActivate} disabled={!!activating}>
              {activating ? "Wird freigeschaltet..." : "Freischalten"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
