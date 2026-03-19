import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const KALENDER_FARBEN = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

const formSchema = z.object({
  vorname: z.string().min(1, 'Vorname ist erforderlich').trim(),
  nachname: z.string().min(1, 'Nachname ist erforderlich').trim(),
  telefon: z.string().trim().optional().or(z.literal('')),
  strasse: z.string().trim().optional().or(z.literal('')),
  plz: z.string().regex(/^(\d{5})?$/, 'PLZ muss 5 Ziffern haben').optional().or(z.literal('')),
  stadt: z.string().trim().optional().or(z.literal('')),
  zustaendigkeitsbereich: z.string().min(1, 'Zuständigkeitsbereich ist erforderlich').trim(),
  farbe_kalender: z.string().default('#3B82F6'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMitarbeiterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMitarbeiterDialog({ open, onOpenChange, onSuccess }: AddMitarbeiterDialogProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vorname: '',
      nachname: '',
      telefon: '',
      strasse: '',
      plz: '',
      stadt: 'Hannover',
      zustaendigkeitsbereich: '',
      farbe_kalender: '#3B82F6',
    },
  });

  const selectedColor = watch('farbe_kalender');

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('mitarbeiter').insert({
        vorname: values.vorname,
        nachname: values.nachname,
        telefon: values.telefon || null,
        strasse: values.strasse || null,
        plz: values.plz || null,
        stadt: values.stadt || null,
        zustaendigkeitsbereich: values.zustaendigkeitsbereich,
        farbe_kalender: values.farbe_kalender,
        ist_aktiv: true,
      });

      if (error) throw error;

      toast.success('Mitarbeiter erfolgreich angelegt', {
        description: `${values.vorname} ${values.nachname} wurde hinzugefügt.`,
      });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Anlegen', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter anlegen</DialogTitle>
          <DialogDescription>
            Neuen Mitarbeiter zum Team hinzufügen. Kein Login-Zugang — dafür &quot;Benutzer erstellen&quot; nutzen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input id="vorname" {...register('vorname')} placeholder="Max" />
              {errors.vorname && <p className="text-xs text-destructive">{errors.vorname.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nachname">Nachname *</Label>
              <Input id="nachname" {...register('nachname')} placeholder="Mustermann" />
              {errors.nachname && <p className="text-xs text-destructive">{errors.nachname.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" {...register('telefon')} placeholder="0511 1234567" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="strasse">Straße</Label>
              <Input id="strasse" {...register('strasse')} placeholder="Musterstraße 1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plz">PLZ</Label>
              <Input id="plz" {...register('plz')} placeholder="30159" />
              {errors.plz && <p className="text-xs text-destructive">{errors.plz.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stadt">Stadt</Label>
              <Input id="stadt" {...register('stadt')} placeholder="Hannover" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zustaendigkeitsbereich">Zuständigkeitsbereich *</Label>
              <Input id="zustaendigkeitsbereich" {...register('zustaendigkeitsbereich')} placeholder="z.B. Linden-Süd" />
              {errors.zustaendigkeitsbereich && <p className="text-xs text-destructive">{errors.zustaendigkeitsbereich.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kalenderfarbe</Label>
            <div className="flex gap-2 flex-wrap">
              {KALENDER_FARBEN.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? 'hsl(var(--foreground))' : 'transparent',
                    transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                  }}
                  onClick={() => setValue('farbe_kalender', color)}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mitarbeiter anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
