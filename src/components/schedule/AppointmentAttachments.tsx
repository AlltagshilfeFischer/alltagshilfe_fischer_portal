import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/lib/uuid';

interface AppointmentAttachmentsProps {
  terminId: string;
  readOnly?: boolean;
}

interface DokumentRow {
  id: string;
  dateiname: string;
  dateipfad: string;
  mime_type: string;
  groesse_bytes: number;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppointmentAttachments({ terminId, readOnly = false }: AppointmentAttachmentsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DokumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dokumente')
        .select('id, dateiname, dateipfad, mime_type, groesse_bytes, created_at')
        .eq('termin_id', terminId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Laden der Anhänge:', message);
      toast({ title: 'Fehler beim Laden der Anhänge', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [terminId, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Benutzer nicht authentifiziert');

      const storagePath = `termine/${terminId}/${generateUUID()}-${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('dokumente')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Insert record into dokumente table
      const { error: insertError } = await supabase
        .from('dokumente')
        .insert({
          dateiname: file.name,
          dateipfad: storagePath,
          mime_type: file.type || 'application/octet-stream',
          groesse_bytes: file.size,
          hochgeladen_von: userData.user.id,
          titel: file.name,
          kategorie: 'termin_anhang',
          kunden_id: null,
          mitarbeiter_id: null,
          termin_id: terminId,
        });

      if (insertError) throw insertError;

      toast({ title: 'Datei hochgeladen' });
      await fetchDocuments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Hochladen:', message);
      toast({ title: 'Fehler beim Hochladen', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DokumentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from('dokumente')
        .createSignedUrl(doc.dateipfad, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Keine Download-URL erhalten');

      window.open(data.signedUrl, '_blank');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Download:', message);
      toast({ title: 'Fehler beim Download', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async (doc: DokumentRow) => {
    setDeletingId(doc.id);
    try {
      // DB-Eintrag zuerst löschen (dangling blob ist harmlos, dangling DB-Eintrag nicht)
      const { error: dbError } = await supabase
        .from('dokumente')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      // Dann aus Storage löschen
      await supabase.storage
        .from('dokumente')
        .remove([doc.dateipfad]);

      toast({ title: 'Datei gelöscht' });
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Fehler beim Löschen:', message);
      toast({ title: 'Fehler beim Löschen', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Anhänge</h3>
            {documents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {documents.length}
              </Badge>
            )}
          </div>
          {!readOnly && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                {uploading ? 'Hochladen...' : 'Datei anhängen'}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Keine Anhänge vorhanden
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.dateiname}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.groesse_bytes)} &middot;{' '}
                      {new Date(doc.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(doc)}
                    title="Herunterladen"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      title="Löschen"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
