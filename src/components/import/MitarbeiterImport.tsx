import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, UserPlus, Trash2, AlertCircle } from 'lucide-react';

interface ParsedMitarbeiter {
  vorname: string;
  nachname: string;
  email?: string;
  telefon?: string;
  strasse?: string;
  plz?: string;
  stadt?: string;
  soll_wochenstunden?: number;
}

interface MitarbeiterImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MitarbeiterImport({ open, onOpenChange }: MitarbeiterImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<ParsedMitarbeiter[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-mitarbeiter-text', {
        body: { text: inputText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.mitarbeiter?.length) {
        toast({ title: 'Keine Mitarbeiter erkannt', description: 'Die KI konnte keine Mitarbeiter aus dem Text extrahieren.', variant: 'destructive' });
        return;
      }
      setParsed(data.mitarbeiter);
      setStep('preview');
    } catch (e: any) {
      toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemove = (index: number) => {
    setParsed(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    const valid = parsed.filter(m => m.vorname && m.nachname);
    if (!valid.length) {
      toast({ title: 'Keine gültigen Einträge', description: 'Jeder Mitarbeiter benötigt mindestens Vorname und Nachname.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (const m of valid) {
      try {
        const { error } = await supabase
          .from('mitarbeiter')
          .insert({
            vorname: m.vorname.trim(),
            nachname: m.nachname.trim(),
            telefon: m.telefon?.trim() || null,
            strasse: m.strasse?.trim() || null,
            plz: m.plz?.trim() || null,
            stadt: m.stadt?.trim() || null,
            soll_wochenstunden: m.soll_wochenstunden || null,
            ist_aktiv: true,
          });
        if (error) throw error;
        success++;
      } catch {
        failed++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['mitarbeiter'] });

    toast({
      title: failed ? 'Teilweiser Import' : 'Import erfolgreich',
      description: `${success} Mitarbeiter angelegt${failed ? `, ${failed} fehlgeschlagen` : ''}`,
      variant: failed ? 'destructive' : 'default',
    });

    handleClose();
  };

  const handleClose = () => {
    setInputText('');
    setParsed([]);
    setStep('input');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Mitarbeiter mit KI importieren
          </DialogTitle>
          <DialogDescription>
            Geben Sie Mitarbeiterdaten in beliebigem Format ein – die KI erkennt und strukturiert sie automatisch.
            Die Mitarbeiter werden direkt als Datensätze angelegt (ohne Einladung).
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Beispiele:\n\nAnna Schmidt, Tel: 0511-12345, 30 Std/Woche\nMarkus Weber, Musterstr. 5, 30159 Hannover\n\nOder als Tabelle:\nVorname;Nachname;Telefon\nLisa;Müller;0511-99999`}
              className="flex-1 min-h-[200px] font-mono text-sm"
            />
            <Button onClick={handleParse} disabled={!inputText.trim() || isParsing} className="w-full">
              {isParsing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> KI analysiert...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Mit KI analysieren</>
              )}
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {parsed.length} Mitarbeiter erkannt
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('input')}>
                Zurück zum Text
              </Button>
            </div>

            <div className="flex-1 overflow-auto space-y-2 min-h-0">
              {parsed.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {m.vorname} {m.nachname}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {m.email && `${m.email} · `}
                      {m.telefon && `Tel: ${m.telefon}`}
                      {m.soll_wochenstunden && ` · ${m.soll_wochenstunden}h/Woche`}
                    </div>
                    {(m.strasse || m.stadt) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {[m.strasse, m.plz, m.stadt].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={isImporting || !parsed.some(m => m.vorname && m.nachname)}
              className="w-full"
            >
              {isImporting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mitarbeiter werden angelegt...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" /> {parsed.filter(m => m.vorname && m.nachname).length} Mitarbeiter anlegen</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
