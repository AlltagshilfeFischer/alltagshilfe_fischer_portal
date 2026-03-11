import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DevModule {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

interface DevFeature {
  id: string;
  module_id: string;
  name: string;
  description: string;
  progress_percent: number;
  status: 'geplant' | 'in_entwicklung' | 'testphase' | 'fertig';
  sort_order: number;
}

interface DevNote {
  id: string;
  feature_id: string;
  text: string;
  author: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DevFeature['status'], string> = {
  geplant: 'Geplant',
  in_entwicklung: 'In Entwicklung',
  testphase: 'Testphase',
  fertig: 'Fertig',
};

const STATUS_VARIANTS: Record<
  DevFeature['status'],
  'outline' | 'secondary' | 'default' | 'destructive'
> = {
  geplant: 'outline',
  in_entwicklung: 'secondary',
  testphase: 'destructive',
  fertig: 'default',
};

function moduleProgress(features: DevFeature[]): number {
  if (features.length === 0) return 0;
  return Math.round(features.reduce((s, f) => s + f.progress_percent, 0) / features.length);
}

// ─── Inline Progress Editor ───────────────────────────────────────────────────

function ProgressCell({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const n = Math.min(100, Math.max(0, parseInt(draft, 10) || 0));
    onSave(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        className="w-14 text-right text-sm font-semibold border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      className="text-sm font-semibold text-primary hover:underline tabular-nums min-w-[3rem] text-right"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="Klicken zum Bearbeiten"
    >
      {value}%
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EntwicklungsStatus() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Expanded notes per feature
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  // New feature input per module
  const [newFeatureName, setNewFeatureName] = useState<Record<string, string>>({});
  // New note input per feature
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  // New module input
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  // ── Queries ──

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['dev-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_modules' as never)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DevModule[];
    },
  });

  const { data: features = [], isLoading: featuresLoading } = useQuery({
    queryKey: ['dev-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_features' as never)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DevFeature[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['dev-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_notes' as never)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DevNote[];
    },
  });

  // ── Mutations ──

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dev-modules'] });
    queryClient.invalidateQueries({ queryKey: ['dev-features'] });
    queryClient.invalidateQueries({ queryKey: ['dev-notes'] });
  };

  const addModule = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = modules.length ? Math.max(...modules.map((m) => m.sort_order)) : 0;
      const { error } = await supabase
        .from('dev_modules' as never)
        .insert({ name, sort_order: maxOrder + 1 } as never);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Modul hinzugefügt'); },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const addFeature = useMutation({
    mutationFn: async ({ module_id, name }: { module_id: string; name: string }) => {
      const moduleFeatures = features.filter((f) => f.module_id === module_id);
      const maxOrder = moduleFeatures.length
        ? Math.max(...moduleFeatures.map((f) => f.sort_order))
        : 0;
      const { error } = await supabase
        .from('dev_features' as never)
        .insert({ module_id, name, sort_order: maxOrder + 1 } as never);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dev-features'] }); toast.success('Feature hinzugefügt'); },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });

  const updateFeature = useMutation({
    mutationFn: async ({
      id,
      progress_percent,
      status,
    }: {
      id: string;
      progress_percent?: number;
      status?: DevFeature['status'];
    }) => {
      const { error } = await supabase
        .from('dev_features' as never)
        .update({ progress_percent, status, updated_at: new Date().toISOString() } as never)
        .eq('id' as never, id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-features'] }),
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dev_features' as never)
        .delete()
        .eq('id' as never, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-features'] });
      queryClient.invalidateQueries({ queryKey: ['dev-notes'] });
      toast.success('Feature gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const addNote = useMutation({
    mutationFn: async ({ feature_id, text }: { feature_id: string; text: string }) => {
      const { error } = await supabase
        .from('dev_notes' as never)
        .insert({
          feature_id,
          text,
          author: session?.user?.email ?? '',
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-notes'] });
      toast.success('Notiz gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dev_notes' as never)
        .delete()
        .eq('id' as never, id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-notes'] }),
    onError: () => toast.error('Fehler beim Löschen'),
  });

  // ── Derived data ──

  const featuresByModule = useMemo(() => {
    const map: Record<string, DevFeature[]> = {};
    for (const f of features) {
      if (!map[f.module_id]) map[f.module_id] = [];
      map[f.module_id].push(f);
    }
    return map;
  }, [features]);

  const notesByFeature = useMemo(() => {
    const map: Record<string, DevNote[]> = {};
    for (const n of notes) {
      if (!map[n.feature_id]) map[n.feature_id] = [];
      map[n.feature_id].push(n);
    }
    return map;
  }, [notes]);

  const overallProgress = useMemo(() => {
    if (features.length === 0) return 0;
    return Math.round(features.reduce((s, f) => s + f.progress_percent, 0) / features.length);
  }, [features]);

  const toggleFeatureNotes = (id: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Handlers ──

  const handleAddFeature = (module_id: string) => {
    const name = (newFeatureName[module_id] || '').trim();
    if (!name) return;
    addFeature.mutate({ module_id, name });
    setNewFeatureName((p) => ({ ...p, [module_id]: '' }));
  };

  const handleAddNote = (feature_id: string) => {
    const text = (newNoteText[feature_id] || '').trim();
    if (!text) return;
    addNote.mutate({ feature_id, text });
    setNewNoteText((p) => ({ ...p, [feature_id]: '' }));
  };

  const handleAddModule = () => {
    const name = newModuleName.trim();
    if (!name) return;
    addModule.mutate(name);
    setNewModuleName('');
    setShowAddModule(false);
  };

  if (modulesLoading || featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Entwicklungsstand</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gesamtfortschritt · {features.length} Features · {modules.length} Module
              </p>
            </div>
            <span className="text-3xl font-bold text-primary tabular-nums">{overallProgress}%</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* ── Module Cards ── */}
      <div className="space-y-4">
        {modules.map((mod) => {
          const modFeatures = featuresByModule[mod.id] ?? [];
          const progress = moduleProgress(modFeatures);

          return (
            <Card key={mod.id} className="overflow-hidden">
              {/* Module Header */}
              <div className="px-5 pt-4 pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-base">{mod.name}</h2>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-muted-foreground">
                      {modFeatures.length} Features
                    </span>
                    <span className="text-lg font-bold text-primary tabular-nums">{progress}%</span>
                  </div>
                </div>
                <Progress value={progress} className="h-1.5 mt-2" />
              </div>

              {/* Features */}
              <CardContent className="p-0">
                {modFeatures.length === 0 && (
                  <p className="text-sm text-muted-foreground px-5 py-3">Noch keine Features.</p>
                )}

                {modFeatures.map((feature, idx) => {
                  const featureNotes = notesByFeature[feature.id] ?? [];
                  const notesExpanded = expandedFeatures.has(feature.id);

                  return (
                    <div
                      key={feature.id}
                      className={`${idx > 0 ? 'border-t' : ''}`}
                    >
                      {/* Feature Row */}
                      <div className="flex items-center gap-3 px-5 py-3 group hover:bg-muted/20 transition-colors">
                        {/* Name + Progress Bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">{feature.name}</span>
                          </div>
                          <Progress value={feature.progress_percent} className="h-1" />
                        </div>

                        {/* Status */}
                        <Select
                          value={feature.status}
                          onValueChange={(v) =>
                            updateFeature.mutate({
                              id: feature.id,
                              status: v as DevFeature['status'],
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-36 text-xs border-none shadow-none focus:ring-0 p-1">
                            <SelectValue>
                              <Badge variant={STATUS_VARIANTS[feature.status]} className="text-xs">
                                {STATUS_LABELS[feature.status]}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABELS) as DevFeature['status'][]).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                <Badge variant={STATUS_VARIANTS[s]} className="text-xs">
                                  {STATUS_LABELS[s]}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Progress % */}
                        <ProgressCell
                          value={feature.progress_percent}
                          onSave={(v) =>
                            updateFeature.mutate({ id: feature.id, progress_percent: v })
                          }
                        />

                        {/* Notes toggle */}
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleFeatureNotes(feature.id)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {featureNotes.length > 0 && (
                            <span className="tabular-nums">{featureNotes.length}</span>
                          )}
                          {notesExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>

                        {/* Delete feature */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                          onClick={() => deleteFeature.mutate(feature.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Notes Panel */}
                      {notesExpanded && (
                        <div className="bg-muted/30 border-t px-5 py-3 space-y-2">
                          {featureNotes.length === 0 && (
                            <p className="text-xs text-muted-foreground">Noch keine Notizen.</p>
                          )}
                          {featureNotes.map((note) => (
                            <div
                              key={note.id}
                              className="flex items-start gap-2 group/note text-sm"
                            >
                              <div className="flex-1 bg-background rounded-md border px-3 py-2">
                                <p className="text-sm">{note.text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {note.author && `${note.author} · `}
                                  {format(new Date(note.created_at), 'd. MMM yyyy', { locale: de })}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover/note:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0 mt-0.5"
                                onClick={() => deleteNote.mutate(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}

                          {/* Add note */}
                          <div className="flex gap-2 pt-1">
                            <Textarea
                              placeholder="Notiz hinzufügen..."
                              className="h-9 min-h-9 text-xs resize-none py-2"
                              value={newNoteText[feature.id] || ''}
                              onChange={(e) =>
                                setNewNoteText((p) => ({ ...p, [feature.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddNote(feature.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-9 px-2 shrink-0"
                              onClick={() => handleAddNote(feature.id)}
                              disabled={!(newNoteText[feature.id] || '').trim()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Feature Row */}
                <div className="flex gap-2 px-5 py-3 border-t bg-muted/10">
                  <Input
                    placeholder="Neues Feature..."
                    className="h-8 text-sm"
                    value={newFeatureName[mod.id] || ''}
                    onChange={(e) =>
                      setNewFeatureName((p) => ({ ...p, [mod.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFeature(mod.id);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 shrink-0"
                    onClick={() => handleAddFeature(mod.id)}
                    disabled={!(newFeatureName[mod.id] || '').trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Add Module ── */}
      <div>
        {showAddModule ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="Neues Modul (z.B. Reporting)..."
              className="h-9"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddModule();
                if (e.key === 'Escape') setShowAddModule(false);
              }}
            />
            <Button size="sm" className="h-9" onClick={handleAddModule}>
              Hinzufügen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => setShowAddModule(false)}
            >
              Abbrechen
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowAddModule(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Modul hinzufügen
          </Button>
        )}
      </div>
    </div>
  );
}
