
CREATE TABLE public.development_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bereich text NOT NULL,
  titel text NOT NULL,
  erledigt boolean NOT NULL DEFAULT false,
  erstellt_von uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.development_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GF and GlobalAdmin can read development_todos"
  ON public.development_todos FOR SELECT
  TO authenticated
  USING (is_geschaeftsfuehrer(auth.uid()) OR is_globaladmin(auth.uid()));

CREATE POLICY "GF and GlobalAdmin can insert development_todos"
  ON public.development_todos FOR INSERT
  TO authenticated
  WITH CHECK (is_geschaeftsfuehrer(auth.uid()) OR is_globaladmin(auth.uid()));

CREATE POLICY "GF and GlobalAdmin can update development_todos"
  ON public.development_todos FOR UPDATE
  TO authenticated
  USING (is_geschaeftsfuehrer(auth.uid()) OR is_globaladmin(auth.uid()));

CREATE POLICY "GF and GlobalAdmin can delete development_todos"
  ON public.development_todos FOR DELETE
  TO authenticated
  USING (is_geschaeftsfuehrer(auth.uid()) OR is_globaladmin(auth.uid()));
