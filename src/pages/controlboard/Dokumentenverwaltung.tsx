import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, Download, Trash2, Upload, Search, Calendar, User, Users, Building2, 
  ChevronRight, ChevronDown, FolderOpen, File, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type DokumentKategorie = 'kunde' | 'mitarbeiter' | 'intern';

interface Dokument {
  id: string;
  titel: string;
  beschreibung: string | null;
  dateiname: string;
  dateipfad: string;
  mime_type: string;
  groesse_bytes: number;
  kategorie: DokumentKategorie;
  kunden_id: string | null;
  mitarbeiter_id: string | null;
  hochgeladen_von: string;
  created_at: string;
  kunden?: {
    vorname: string | null;
    nachname: string | null;
  } | null;
  mitarbeiter?: {
    vorname: string | null;
    nachname: string | null;
  } | null;
}

interface Kunde {
  id: string;
  vorname: string | null;
  nachname: string | null;
  kategorie: string | null;
}

interface Mitarbeiter {
  id: string;
  vorname: string | null;
  nachname: string | null;
}

export default function Dokumentenverwaltung() {
  const [dokumente, setDokumente] = useState<Dokument[]>([]);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<DokumentKategorie>('kunde');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    titel: '',
    beschreibung: '',
    kategorie: 'kunde' as DokumentKategorie,
    kunden_id: '',
    mitarbeiter_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadKunden();
    loadMitarbeiter();
    loadDokumente();
  }, []);

  // Auto-select first entity when switching tabs
  useEffect(() => {
    if (activeTab === 'kunde' && kunden.length > 0 && !selectedEntityId) {
      setSelectedEntityId(kunden[0].id);
    } else if (activeTab === 'mitarbeiter' && mitarbeiter.length > 0 && !selectedEntityId) {
      setSelectedEntityId(mitarbeiter[0].id);
    } else if (activeTab === 'intern') {
      setSelectedEntityId(null);
    }
  }, [activeTab, kunden, mitarbeiter]);

  const loadKunden = async () => {
    const { data, error } = await supabase
      .from('kunden')
      .select('id, vorname, nachname, kategorie')
      .eq('aktiv', true)
      .order('nachname');

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Kunden konnten nicht geladen werden',
        variant: 'destructive',
      });
      return;
    }

    setKunden(data || []);
  };

  const loadMitarbeiter = async () => {
    const { data, error } = await supabase
      .from('mitarbeiter')
      .select('id, vorname, nachname')
      .eq('ist_aktiv', true)
      .order('nachname');

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Mitarbeiter konnten nicht geladen werden',
        variant: 'destructive',
      });
      return;
    }

    setMitarbeiter(data || []);
  };

  const loadDokumente = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dokumente')
      .select(`
        *,
        kunden:kunden_id (vorname, nachname),
        mitarbeiter:mitarbeiter_id (vorname, nachname)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Dokumente konnten nicht geladen werden',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setDokumente((data || []) as Dokument[]);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.titel) {
      toast({
        title: 'Fehler',
        description: 'Bitte Titel und Datei auswählen',
        variant: 'destructive',
      });
      return;
    }

    if (uploadForm.kategorie === 'kunde' && !uploadForm.kunden_id) {
      toast({
        title: 'Fehler',
        description: 'Bitte einen Kunden auswählen',
        variant: 'destructive',
      });
      return;
    }

    if (uploadForm.kategorie === 'mitarbeiter' && !uploadForm.mitarbeiter_id) {
      toast({
        title: 'Fehler',
        description: 'Bitte einen Mitarbeiter auswählen',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const fileExt = uploadForm.file.name.split('.').pop();
      let folderPath = '';
      if (uploadForm.kategorie === 'kunde') {
        folderPath = `kunden/${uploadForm.kunden_id}`;
      } else if (uploadForm.kategorie === 'mitarbeiter') {
        folderPath = `mitarbeiter/${uploadForm.mitarbeiter_id}`;
      } else {
        folderPath = 'intern';
      }
      const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dokumente')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase
        .from('dokumente')
        .insert({
          titel: uploadForm.titel,
          beschreibung: uploadForm.beschreibung || null,
          dateiname: uploadForm.file.name,
          dateipfad: fileName,
          mime_type: uploadForm.file.type,
          groesse_bytes: uploadForm.file.size,
          kategorie: uploadForm.kategorie,
          kunden_id: uploadForm.kategorie === 'kunde' ? uploadForm.kunden_id : null,
          mitarbeiter_id: uploadForm.kategorie === 'mitarbeiter' ? uploadForm.mitarbeiter_id : null,
          hochgeladen_von: user.id,
        });

      if (metadataError) throw metadataError;

      toast({
        title: 'Erfolg',
        description: 'Dokument erfolgreich hochgeladen',
      });

      setUploadDialogOpen(false);
      setUploadForm({
        titel: '',
        beschreibung: '',
        kategorie: 'kunde',
        kunden_id: '',
        mitarbeiter_id: '',
        file: null,
      });
      loadDokumente();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Upload fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (dokument: Dokument) => {
    try {
      const { data, error } = await supabase.storage
        .from('dokumente')
        .download(dokument.dateipfad);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = dokument.dateiname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Erfolg',
        description: 'Dokument wird heruntergeladen',
      });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Download fehlgeschlagen',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (dokument: Dokument) => {
    if (!confirm(`Dokument "${dokument.titel}" wirklich löschen?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('dokumente')
        .remove([dokument.dateipfad]);

      if (storageError) throw storageError;

      const { error: metadataError } = await supabase
        .from('dokumente')
        .delete()
        .eq('id', dokument.id);

      if (metadataError) throw metadataError;

      toast({
        title: 'Erfolg',
        description: 'Dokument gelöscht',
      });

      loadDokumente();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Löschen fehlgeschlagen',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  // Get documents for selected entity, grouped by year
  const entityDocuments = useMemo(() => {
    let filtered = dokumente.filter(d => d.kategorie === activeTab);
    
    if (activeTab === 'kunde' && selectedEntityId) {
      filtered = filtered.filter(d => d.kunden_id === selectedEntityId);
    } else if (activeTab === 'mitarbeiter' && selectedEntityId) {
      filtered = filtered.filter(d => d.mitarbeiter_id === selectedEntityId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.titel.toLowerCase().includes(query) ||
        d.dateiname.toLowerCase().includes(query) ||
        (d.beschreibung && d.beschreibung.toLowerCase().includes(query))
      );
    }

    // Group by year
    const grouped: Record<string, Dokument[]> = {};
    filtered.forEach(doc => {
      const year = new Date(doc.created_at).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(doc);
    });

    // Sort years descending
    const sortedYears = Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a));
    
    return { grouped, sortedYears, total: filtered.length };
  }, [dokumente, activeTab, selectedEntityId, searchQuery]);

  // Get document count per entity
  const getEntityDocCount = (entityId: string, type: 'kunde' | 'mitarbeiter') => {
    return dokumente.filter(d => 
      type === 'kunde' ? d.kunden_id === entityId : d.mitarbeiter_id === entityId
    ).length;
  };

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  // Auto-expand current year
  useEffect(() => {
    const currentYear = new Date().getFullYear().toString();
    setExpandedYears(new Set([currentYear]));
  }, []);

  const getEntityFullName = (entity: Kunde | Mitarbeiter) => {
    return `${entity.vorname || ''} ${entity.nachname || ''}`.trim() || 'Unbekannt';
  };

  const getSelectedEntityName = () => {
    if (activeTab === 'kunde') {
      const kunde = kunden.find(k => k.id === selectedEntityId);
      return kunde ? getEntityFullName(kunde) : '';
    } else if (activeTab === 'mitarbeiter') {
      const ma = mitarbeiter.find(m => m.id === selectedEntityId);
      return ma ? getEntityFullName(ma) : '';
    }
    return 'Interne Dokumente';
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dokumentenverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Dokumente nach Kunden und Mitarbeitern organisiert
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Dokument hochladen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neues Dokument hochladen</DialogTitle>
              <DialogDescription>
                Laden Sie ein Dokument hoch und ordnen Sie es zu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="upload-kategorie">Kategorie *</Label>
                <Select
                  value={uploadForm.kategorie}
                  onValueChange={(value: DokumentKategorie) =>
                    setUploadForm({ ...uploadForm, kategorie: value, kunden_id: '', mitarbeiter_id: '' })
                  }
                >
                  <SelectTrigger id="upload-kategorie">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kunde">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Kunden-Dokument
                      </div>
                    </SelectItem>
                    <SelectItem value="mitarbeiter">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Mitarbeiter-Dokument
                      </div>
                    </SelectItem>
                    <SelectItem value="intern">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Internes Dokument
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="upload-titel">Titel *</Label>
                <Input
                  id="upload-titel"
                  value={uploadForm.titel}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, titel: e.target.value })
                  }
                  placeholder="z.B. Pflegevertrag 2025"
                />
              </div>
              <div>
                <Label htmlFor="upload-beschreibung">Beschreibung</Label>
                <Textarea
                  id="upload-beschreibung"
                  value={uploadForm.beschreibung}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, beschreibung: e.target.value })
                  }
                  placeholder="Optionale Beschreibung..."
                  rows={3}
                />
              </div>
              
              {uploadForm.kategorie === 'kunde' && (
                <div>
                  <Label htmlFor="upload-kunde">Kunde *</Label>
                  <Select
                    value={uploadForm.kunden_id}
                    onValueChange={(value) =>
                      setUploadForm({ ...uploadForm, kunden_id: value })
                    }
                  >
                    <SelectTrigger id="upload-kunde">
                      <SelectValue placeholder="Kunde auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kunden.map((kunde) => (
                        <SelectItem key={kunde.id} value={kunde.id}>
                          {getEntityFullName(kunde)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {uploadForm.kategorie === 'mitarbeiter' && (
                <div>
                  <Label htmlFor="upload-mitarbeiter">Mitarbeiter *</Label>
                  <Select
                    value={uploadForm.mitarbeiter_id}
                    onValueChange={(value) =>
                      setUploadForm({ ...uploadForm, mitarbeiter_id: value })
                    }
                  >
                    <SelectTrigger id="upload-mitarbeiter">
                      <SelectValue placeholder="Mitarbeiter auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mitarbeiter.map((ma) => (
                        <SelectItem key={ma.id} value={ma.id}>
                          {getEntityFullName(ma)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="upload-file">Datei *</Label>
                <Input
                  id="upload-file"
                  type="file"
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                {uploadForm.file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={uploading}
              >
                Abbrechen
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as DokumentKategorie);
        setSelectedEntityId(null);
        setSearchQuery('');
      }} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="kunde" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Kunden ({dokumente.filter(d => d.kategorie === 'kunde').length})
          </TabsTrigger>
          <TabsTrigger value="mitarbeiter" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mitarbeiter ({dokumente.filter(d => d.kategorie === 'mitarbeiter').length})
          </TabsTrigger>
          <TabsTrigger value="intern" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Intern ({dokumente.filter(d => d.kategorie === 'intern').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 min-h-0 mt-0">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left sidebar: Entity list */}
            {activeTab !== 'intern' && (
              <Card className="col-span-3 flex flex-col min-h-0">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9"
                      placeholder={`${activeTab === 'kunde' ? 'Kunde' : 'Mitarbeiter'} suchen...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {activeTab === 'kunde' ? (
                      kunden.map((kunde) => {
                        const docCount = getEntityDocCount(kunde.id, 'kunde');
                        const isSelected = selectedEntityId === kunde.id;
                        return (
                          <button
                            key={kunde.id}
                            onClick={() => setSelectedEntityId(kunde.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <User className={`h-4 w-4 flex-shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`} />
                              <span className="truncate font-medium text-sm">
                                {getEntityFullName(kunde)}
                              </span>
                            </div>
                            <Badge 
                              variant={isSelected ? "secondary" : "outline"} 
                              className={`ml-2 flex-shrink-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}
                            >
                              {docCount}
                            </Badge>
                          </button>
                        );
                      })
                    ) : (
                      mitarbeiter.map((ma) => {
                        const docCount = getEntityDocCount(ma.id, 'mitarbeiter');
                        const isSelected = selectedEntityId === ma.id;
                        return (
                          <button
                            key={ma.id}
                            onClick={() => setSelectedEntityId(ma.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Users className={`h-4 w-4 flex-shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`} />
                              <span className="truncate font-medium text-sm">
                                {getEntityFullName(ma)}
                              </span>
                            </div>
                            <Badge 
                              variant={isSelected ? "secondary" : "outline"} 
                              className={`ml-2 flex-shrink-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}
                            >
                              {docCount}
                            </Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* Right content: Documents grouped by year */}
            <Card className={`${activeTab === 'intern' ? 'col-span-12' : 'col-span-9'} flex flex-col min-h-0`}>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">
                        {getSelectedEntityName() || 'Kein Eintrag ausgewählt'}
                      </CardTitle>
                      <CardDescription>
                        {entityDocuments.total} Dokument{entityDocuments.total !== 1 ? 'e' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  {activeTab === 'intern' && (
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9 h-9"
                        placeholder="Dokument suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Dokumente werden geladen...</p>
                  </div>
                ) : !selectedEntityId && activeTab !== 'intern' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mb-4 opacity-50" />
                    <p>Wählen Sie einen {activeTab === 'kunde' ? 'Kunden' : 'Mitarbeiter'} aus</p>
                  </div>
                ) : entityDocuments.total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>Keine Dokumente vorhanden</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {entityDocuments.sortedYears.map((year) => (
                      <Collapsible 
                        key={year}
                        open={expandedYears.has(year)}
                        onOpenChange={() => toggleYear(year)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            {expandedYears.has(year) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{year}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {entityDocuments.grouped[year].length} Dokument{entityDocuments.grouped[year].length !== 1 ? 'e' : ''}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
                            {entityDocuments.grouped[year].map((dokument) => (
                              <div
                                key={dokument.id}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow group"
                              >
                                <span className="text-2xl flex-shrink-0">
                                  {getMimeTypeIcon(dokument.mime_type)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{dokument.titel}</span>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {formatFileSize(dokument.groesse_bytes)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    <span className="truncate">{dokument.dateiname}</span>
                                    <span>•</span>
                                    <span>{format(new Date(dokument.created_at), 'dd.MM.yyyy', { locale: de })}</span>
                                  </div>
                                  {dokument.beschreibung && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {dokument.beschreibung}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownload(dokument)}
                                    title="Herunterladen"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(dokument)}
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
