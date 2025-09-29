import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Building2, Save, Plus, Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parseCustomerData, importCustomers } from '@/utils/customerImport';

export default function NewEntries() {
  const [newCustomer, setNewCustomer] = useState({
    vorname: '',
    nachname: '',
    geburtsdatum: '',
    adresse: '',
    telefon: '',
    email: '',
    notfallkontakt_name: '',
    notfallkontakt_telefon: '',
    notizen: ''
  });

  const [newEmployee, setNewEmployee] = useState({
    position: '',
    mitarbeiter_nummer: '',
    stundenlohn: '',
    qualifikationen: '',
    notizen: ''
  });

  const [bulkCustomerText, setBulkCustomerText] = useState(`Aysegül Domke-Schreck		1	Försterkamp 5f, 30539 Hannover	Bemerode	12.12.1963	AOK Niedersachsen	F267085117	Nicht beantragt		Kasse		Aktiv	3	Mo-So				Apr-24	Sep-24	Beidseitiges Einverständnis/ Putzfirma und keine Betreuung sondern Ruhe	
Ferdinand Ursula	Sabino	1	Friedrich Silcher Str. 3, 30173 Hannover	Südstadt	18.06.1946	AOK Niedersachsen	H815832739		0511 88 26 76	Kasse		Aktiv	3	Do-Fr				Apr-24			
Steinmann Karin	Jil	2	Wallensteinstraße 108b, 30459 Hannover	Ricklingen	04.05.1944	BIGdirekt	K996486172	Fehlt		Kasse		Aktiv	6	Mo-Fr			Michaela Willicke (Tochter)	Apr-24			
Rost Insa	Alina	1	Kleestraße 22, 30625 Hannover	Kleefeld	28.06.1963	DAK	F570740469			Kasse		Aktiv	3	Mo-Sa				May-24			
Vordemann Sigrid 	Nadine	1	Mommsenstraße 10, 30173 Hannover	Südstadt	03.06.1942	DAK-Gesundheit	X195399934			Kasse		Aktiv	3	Mo-Fr		Frau		May-24			
Brockmann Edelgard	Jil	1	Lauenauer Str 17, 30459 Hannover	Ricklingen	23.07.1938	Barmer	U937118259			Kasse		Aktiv	3	Nicht Mo, Di nur 1-3				Jun-24			
Dr Walter Neumann	Florian	0	Am Listholze 29B, 30177 Hannover	List	11.10.1947			-		Privat		Aktiv	6	Fr				May-24			
Hoffmann Vera	Siska	2	Escherstraße 22A, 30159 Hannover	Mitte	8/27/1931	AOK Niedersachsen	R964342919	Ja 		Kasse	Mail an Bruder	Aktiv	6				Herr Tinschert	Jun-24			
von Ungern-Sternberg Ingrid 	Sabino	2	Bernwardstraße 36, 30519 Hannover	Döhren-Wülfel	11.04.1936	Techniker	X329978694	Fehlt	0511 83 14 81	Kasse		Aktiv	6					Jun-24			
Müller Karin	Jil	2	Bonhoeffer Str. 3, 30457 Hannover	Ricklingen	28.12.1956	Mobil Krankenkasse	Z211685368	Ja 	0179 939 8838	Kasse		Aktiv	6					Jun-24			
Willsch Edith	Nadine	2	Bandelstraße 10, 30171 Hannover	Südstadt	30.04.1930	Barmer	C349772798			Kasse		Aktiv	3	Do		Frau		Jun-24			
Niemeyer Vera	Jil	2	Friedländer Weg 27, 30459 Hannover	Ricklingen	20.09.1943	AOK Niedersachsen	S301857797	Ja	0511 447767	Kasse	Ja	Aktiv	12	Do				Aug-24			
Pinkepank Edda	Sabino	2	Davenstedter Holz 60, 30455 Hannover	Davenstedt	25.04.1941	Techniker	N289967540	-	0511 59 04 749	Kasse/Privat		Aktiv	6	Do			Sandra Jamm (Tochter)	Aug-24			
Rosebrock Ursel Marianne 	Sallinger	2	Louise-Schröder Straße 3, 30627 Hannover	Groß-Buchholz	31.01.1943	AOK Niedersachsen	N667509742	Ja 	0511 27 17 907	Kasse		Aktiv	6	Mi				Oct-24			
Rosebrock Hans- Hermann Werner 	Sallinger	2	Louise-Schröder Straße 3, 30627 Hannover	Groß-Buchholz	20.06.1940	AOK Niedersachsen	H274216549		0511 27 17 907	Kasse		Aktiv	0	Mi				Oct-24			
Neubauer Inge	Alina	2	Gollstraße 65, 30559 Hannover	Anderten	08.10.1940	IKK Classic	U880015963	Person fehlt		Kasse		Aktiv	3	Mo-Fr				Oct-24			
Dieckmann Ingelore	Alina	2	Kötnerhof 18, 30559 Hannover	Anderten	10.07.1941	AOK Niedersachsen	Y460957542		0511 54410455 / 0175 9807838	Kasse	Mail an Tochter	Aktiv	3	Di-Mi		Top	Ariana Tami ( Tochter) 0175 9783546	Nov-24			
Jacke Sabine	Nasja	1	Feldstraße 6, 31275 Lehrte	Lehrte	03.12.1956	AOK Niedersachsen	P535609661		05132 92 84 868	Kasse		Aktiv	3	Nicht Donnerstags, gerne Vormittags				Nov-24			
Sören Seebold	Jil	3	Ferdinand-Wilhelm-Fricke Weg 10, 30169 Hannover	Ricklingen	19.08.2003	TK	P589144338		0152 5422 7046	Kasse		Aktiv	3					Aug-24			
Jannes Günther	Jil	3	Ferdinand-Wilhelm-Fricke Weg 10, 30169 Hannover	Ricklingen	03.05.2003	VIACTIV	L177638266		0152 2752 3387	Kasse		Aktiv	3	Nicht Di 1,2, nicht Mi 2				Aug-24			
Köper Christine	Ilka	3	Hauptstraße 70B, 30916 Isernhagen	Isernhagen	10/4/1941	DKV 	KV203961575	Ja	05139 9588420	Kasse		Aktiv	6	Tag egal, am liebsten 10:15			Markus Köper (Sohn, 01725224180)	Nov-24			
Härtel Marlis	Gaby	2	Klabundestr. 3A, 30627 Hannover	Groß-Buchholz	08.02.1935	Barmer	N353186997	Fehlt	0511 57 28 94	Beihilfe		Aktiv	6	Morgens (Fr)			Katrin Härtel (Tochter) 0175 9028 060	Nov-24			
Schmidtmann Heinz	Gaby	2	Widemannstraße 3, 30625 Hannover	Kleefeld	26/03/1937	BARMER	T971668027		0511 633 763	Kasse		Aktiv	3	nicht Mi nicht morgens			0179 6666 878 Stühmann Kerstin, Tochter	Nov-24			
Rosenbaum Edelgard	Nadine	3	Böhmerstraße 31, 30173 Hannover	Südstadt	17/07/1938	AOK Niedersachsen	A984226266		0511 3735 7417;     0151 501 89 269	Kasse		Aktiv	3	Mi 15:30			0511 592 256 Rosenbaum-Wollers Birgit, Tochter	Nov-24		Ab November alle 2 Wochen Sabino um 15:30	
Schulze Ruth	Gaby	2	Müdener Weg 2, 30625 Hannover	Groß-Buchholz	6/7/1937	TK	N140088039		0511 575 673;          0151 288 88654	Kasse		Aktiv	3	Alle 2 W, Tag egal, 8:30			0163 563 7333 Schulze Stephan, Sohn	Nov-24			
Brandt Fred	Gaby	2	Rotekreuzstr. 46A, 30627 Hannover	Groß-Buchholz	2/7/1939	AOK Niedersachsen	H679873096	Ja 	0511 577 386;          0175 709 1850	Kasse		Aktiv	6	Tag egal 2,5			  Brandt Margarete, Ehefrau	Nov-24			
Brandt Margarete	Gaby	2	Rotekreuzstr. 46A, 30627 Hannover	Groß-Buchholz	29/06/1935	AOK Niedersachsen	K307377165	Ja 	0511 577 386;          0175 709 1850	Kasse		Aktiv	0	Tag egal 2,5			0511 6064 4715 Grauwinkel Monika, Tochter	Nov-24			
Hennemann Ursula	Alina	2	Zieglerhof 10, 30655 Hannover	Groß-Buchholz	6/1/1939	AOK Niedersachsen	Y488663211	Ja 	0511 549 0376;      0157 542 06508	Kasse		Aktiv	6	Nicht Di, lieber Morgens/Vormittags			0178 938 8904 Fuchs Oliver, Sohn	Nov-24		Termin noch verschieben	
Düsterdiek Wilfried	Sallinger	2	Kurt-Schumacher-Ring 7, 30627 Hannover	Groß-Buchholz	26/12/1938	TK	K370752702	Person fehlt	0511 572 114	Kasse		Aktiv	6	Mi 3		Sallinger	  Düsterdiek Erika, Ehefrau	Nov-24			
Bruns Gerhard	Gaby	2	Schweriner Str. 11, 30625 Hannover	Kleefeld	2/6/1936	DAK-Gesundheit	C380993125		0511 5551 87;        0160 997 04615	Kasse		Aktiv	3	tag egal: 15:30-1700			0157 516 79008 Lechler Viktoria, Enkeltochter	Nov-24			
Rademacher Rosemarie	Alina	1	Efeuhof 5, 30655 Hannover	Misburg	1/8/1946	DAK-Gesundheit	W007754611	-	0511 5911 05;        0152 519 83571	Kasse		Aktiv	3	Nicht Mo oder Do, erst ab 10		Direkt hintereinander mit Bloch	0172 298 4866 Swirczek Claudia, Tochter	Nov-24		Erstgespräch vereinbart`);

  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing customers to check for duplicates
  const loadCustomers = async () => {
    // This would be used to refresh the customer list after import
    // Implementation depends on your existing data loading strategy
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const { error } = await (supabase as any)
        .from('kunden')
        .insert([customerData]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
      setNewCustomer({
        vorname: '',
        nachname: '',
        geburtsdatum: '',
        adresse: '',
        telefon: '',
        email: '',
        notfallkontakt_name: '',
        notfallkontakt_telefon: '',
        notizen: ''
      });
      toast({
        title: 'Erfolg',
        description: 'Neuer Kunde wurde erstellt',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Kunde konnte nicht erstellt werden',
        variant: 'destructive',
      });
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      // Hinweis: Für neue Mitarbeiter müsste normalerweise ein User Account erstellt werden
      // Dies ist eine vereinfachte Version
      console.log('Employee creation would require user account setup:', employeeData);
      throw new Error('Mitarbeiter-Erstellung erfordert vollständige Benutzerregistrierung');
    },
    onError: (error) => {
      toast({
        title: 'Hinweis',
        description: 'Mitarbeiter-Erstellung erfordert vollständige Benutzerregistrierung und wird in einer zukünftigen Version implementiert',
        variant: 'destructive',
      });
    },
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate(newCustomer);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const employeeData = {
      ...newEmployee,
      stundenlohn: newEmployee.stundenlohn ? parseFloat(newEmployee.stundenlohn) : null,
      qualifikationen: newEmployee.qualifikationen.split(',').map(q => q.trim()).filter(q => q)
    };
    createEmployeeMutation.mutate(employeeData);
  };

  const handleBulkImportCustomers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCustomerText.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine Kundenliste ein',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const customers = parseCustomerData(bulkCustomerText);
      
      if (customers.length === 0) {
        toast({
          title: 'Fehler',
          description: 'Keine gültigen Kundendaten gefunden',
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      const { success, errors } = await importCustomers(customers);
      
      setIsImporting(false);
      setBulkCustomerText('');
      
      toast({
        title: "Import abgeschlossen",
        description: `${success} Kunden erfolgreich importiert${errors.length > 0 ? `, ${errors.length} Fehler` : ''}`,
        variant: success > 0 ? "default" : "destructive",
      });

      if (errors.length > 0) {
        console.log('Import Fehler:', errors);
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['kunden'] });
    } catch (error) {
      setIsImporting(false);
      toast({
        title: "Import Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Neukunden & Neumitarbeiter</h1>
        <p className="text-muted-foreground">
          Erfassen Sie neue Kunden und Mitarbeiter in das System
        </p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customers">Neuer Kunde</TabsTrigger>
          <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="employees">Neuer Mitarbeiter</TabsTrigger>
        </TabsList>

        {/* Neuer Kunde Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Neuen Kunden anlegen
              </CardTitle>
              <CardDescription>
                Erfassen Sie alle relevanten Informationen für den neuen Kunden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCustomer} className="space-y-6">
                {/* Persönliche Daten */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Persönliche Daten</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_first_name">Vorname *</Label>
                      <Input
                        id="customer_first_name"
                        value={newCustomer.vorname}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          vorname: e.target.value
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_last_name">Nachname *</Label>
                      <Input
                        id="customer_last_name"
                        value={newCustomer.nachname}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          nachname: e.target.value
                        })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customer_birth_date">Geburtsdatum</Label>
                    <Input
                      id="customer_birth_date"
                      type="date"
                      value={newCustomer.geburtsdatum}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        geburtsdatum: e.target.value
                      })}
                    />
                  </div>
                </div>

                {/* Kontaktdaten */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kontaktdaten</h3>
                  <div>
                    <Label htmlFor="customer_address">Adresse</Label>
                    <Textarea
                      id="customer_address"
                      value={newCustomer.adresse}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        adresse: e.target.value
                      })}
                      rows={2}
                      placeholder="Straße, Hausnummer, PLZ, Ort"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_phone">Telefon</Label>
                      <Input
                        id="customer_phone"
                        value={newCustomer.telefon}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          telefon: e.target.value
                        })}
                        placeholder="+49 123 456789"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_email">E-Mail</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          email: e.target.value
                        })}
                        placeholder="kunde@beispiel.de"
                      />
                    </div>
                  </div>
                </div>

                {/* Notfallkontakt */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notfallkontakt</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency_contact_name">Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={newCustomer.notfallkontakt_name}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          notfallkontakt_name: e.target.value
                        })}
                        placeholder="Max Mustermann"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency_contact_phone">Telefon</Label>
                      <Input
                        id="emergency_contact_phone"
                        value={newCustomer.notfallkontakt_telefon}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer,
                          notfallkontakt_telefon: e.target.value
                        })}
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Besondere Hinweise */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Besondere Hinweise</h3>
                  <div>
                    <Label htmlFor="customer_notes">Notizen</Label>
                    <Textarea
                      id="customer_notes"
                      value={newCustomer.notizen}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        notizen: e.target.value
                      })}
                      rows={4}
                      placeholder="Allergien, besondere Bedürfnisse, Medikamente, etc."
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createCustomerMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createCustomerMutation.isPending ? 'Speichern...' : 'Kunden anlegen'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk-import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Kunden Bulk Import
              </CardTitle>
              <CardDescription>
                Importieren Sie mehrere Kunden gleichzeitig aus einer Liste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkImportCustomers} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kundenliste</h3>
                  <div>
                    <Label htmlFor="bulk_customer_text">Kundenliste (komplette Datensätze)</Label>
                    <Textarea
                      id="bulk_customer_text"
                      value={bulkCustomerText}
                      onChange={(e) => setBulkCustomerText(e.target.value)}
                      rows={20}
                      placeholder="Fügen Sie hier die vollständige Kundenliste ein..."
                      className="font-mono text-xs"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Die Kundendaten werden automatisch geparst. Namen, Telefonnummern und andere verfügbare Informationen werden extrahiert.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600">💡</div>
                    <div>
                      <h4 className="font-medium text-blue-800">Intelligenter Daten-Import</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Das System erkennt automatisch Namen, Telefonnummern, E-Mail-Adressen und Kontaktpersonen 
                        aus den eingefügten Daten. Weitere Details können später über die Kundenbearbeitung hinzugefügt werden.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isImporting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importiere...' : 'Kunden importieren'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neuer Mitarbeiter Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Neuen Mitarbeiter anlegen
              </CardTitle>
              <CardDescription>
                Hinweis: Die vollständige Mitarbeiterregistrierung erfordert einen Benutzeraccount und wird in einer zukünftigen Version implementiert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEmployee} className="space-y-6">
                {/* Stelleninformationen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Stelleninformationen</h3>
                  <div>
                    <Label htmlFor="employee_position">Position *</Label>
                    <Input
                      id="employee_position"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({
                        ...newEmployee,
                        position: e.target.value
                      })}
                      placeholder="Pflegekraft, Haushaltshilfe, etc."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employee_number">Mitarbeiternummer</Label>
                      <Input
                        id="employee_number"
                        value={newEmployee.mitarbeiter_nummer}
                        onChange={(e) => setNewEmployee({
                          ...newEmployee,
                          mitarbeiter_nummer: e.target.value
                        })}
                        placeholder="MA001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="employee_hourly_rate">Stundenlohn (€)</Label>
                      <Input
                        id="employee_hourly_rate"
                        type="number"
                        step="0.01"
                        value={newEmployee.stundenlohn}
                        onChange={(e) => setNewEmployee({
                          ...newEmployee,
                          stundenlohn: e.target.value
                        })}
                        placeholder="15.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Qualifikationen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Qualifikationen</h3>
                  <div>
                    <Label htmlFor="employee_qualifications">Qualifikationen</Label>
                    <Input
                      id="employee_qualifications"
                      value={newEmployee.qualifikationen}
                      onChange={(e) => setNewEmployee({
                        ...newEmployee,
                        qualifikationen: e.target.value
                      })}
                      placeholder="Altenpflege, Erste Hilfe, Demenzbetreuung (durch Komma getrennt)"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Mehrere Qualifikationen durch Komma trennen
                    </p>
                  </div>
                </div>

                {/* Notizen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Zusätzliche Informationen</h3>
                  <div>
                    <Label htmlFor="employee_notes">Notizen</Label>
                    <Textarea
                      id="employee_notes"
                      value={newEmployee.notizen}
                      onChange={(e) => setNewEmployee({
                        ...newEmployee,
                        notizen: e.target.value
                      })}
                      rows={4}
                      placeholder="Besondere Fähigkeiten, Verfügbarkeit, etc."
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600">⚠️</div>
                    <div>
                      <h4 className="font-medium text-yellow-800">Hinweis zur Mitarbeiterregistrierung</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Die vollständige Registrierung neuer Mitarbeiter erfordert die Erstellung eines Benutzeraccounts 
                        mit E-Mail-Verifizierung und Passwort-Setup. Diese Funktion wird in einer zukünftigen Version 
                        der Anwendung implementiert.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createEmployeeMutation.isPending}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mitarbeiter anlegen (Demo)
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}