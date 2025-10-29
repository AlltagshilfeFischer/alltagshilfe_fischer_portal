import { useState, useEffect } from 'react';
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
import { FileText, Download, Trash2, Upload, Filter, Search, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Dokument {
  id: string;
  titel: string;
  beschreibung: string | null;
  dateiname: string;
  dateipfad: string;
  mime_type: string;
  groesse_bytes: number;
  kunden_id: string;
  hochgeladen_von: string;
  created_at: string;
  kunden?: {
    name: string;
  };
  benutzer?: {
    vorname: string | null;
    nachname: string | null;
  };
}

interface Kunde {
  id: string;
  name: string;
  kategorie: string;
}

export default function Dokumentenverwaltung() {
  const [dokumente, setDokumente] = useState<Dokument[]>([]);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterKundeId, setFilterKundeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    titel: '',
    beschreibung: '',
    kunden_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadKunden();
    loadDokumente();
  }, []);

  const loadKunden = async () => {
    const { data, error } = await supabase
      .from('kunden')
      .select('id, name, kategorie')
      .eq('aktiv', true)
      .order('name');

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

  const loadDokumente = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dokumente')
      .select(`
        *,
        kunden:kunden_id (name),
        benutzer:hochgeladen_von (vorname, nachname)
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

    setDokumente(data || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.titel || !uploadForm.kunden_id) {
      toast({
        title: 'Fehler',
        description: 'Bitte alle Pflichtfelder ausfüllen',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // Generate file path
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${uploadForm.kunden_id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('dokumente')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Create metadata entry
      const { error: metadataError } = await supabase
        .from('dokumente')
        .insert({
          titel: uploadForm.titel,
          beschreibung: uploadForm.beschreibung || null,
          dateiname: uploadForm.file.name,
          dateipfad: fileName,
          mime_type: uploadForm.file.type,
          groesse_bytes: uploadForm.file.size,
          kunden_id: uploadForm.kunden_id,
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
        kunden_id: '',
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

      // Create download link
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('dokumente')
        .remove([dokument.dateipfad]);

      if (storageError) throw storageError;

      // Delete metadata
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

  const filteredDokumente = dokumente.filter((dok) => {
    const matchesKunde = filterKundeId === 'all' || dok.kunden_id === filterKundeId;
    const matchesSearch = 
      dok.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dok.dateiname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dok.beschreibung && dok.beschreibung.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesKunde && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dokumentenverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Kundendokumente zentral und sicher
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
                Laden Sie ein Dokument hoch und verknüpfen Sie es mit einem Kunden
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                        {kunde.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter-kunde">Nach Kunde filtern</Label>
              <Select value={filterKundeId} onValueChange={setFilterKundeId}>
                <SelectTrigger id="filter-kunde">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {kunden.map((kunde) => (
                    <SelectItem key={kunde.id} value={kunde.id}>
                      {kunde.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search-query">Suche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-query"
                  className="pl-9"
                  placeholder="Titel, Dateiname oder Beschreibung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Dokumente werden geladen...</p>
        </div>
      ) : filteredDokumente.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterKundeId !== 'all'
                ? 'Keine Dokumente gefunden'
                : 'Noch keine Dokumente hochgeladen'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDokumente.map((dokument) => (
            <Card key={dokument.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">
                      {getMimeTypeIcon(dokument.mime_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {dokument.titel}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {dokument.dateiname}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dokument.beschreibung && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dokument.beschreibung}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {dokument.kunden?.name || 'Unbekannt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(dokument.created_at), 'dd.MM.yyyy', {
                        locale: de,
                      })}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(dokument.groesse_bytes)}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(dokument)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(dokument)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              {filteredDokumente.length} von {dokumente.length} Dokumenten angezeigt
              {filterKundeId !== 'all' &&
                ` • Gefiltert nach: ${
                  kunden.find((k) => k.id === filterKundeId)?.name
                }`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
