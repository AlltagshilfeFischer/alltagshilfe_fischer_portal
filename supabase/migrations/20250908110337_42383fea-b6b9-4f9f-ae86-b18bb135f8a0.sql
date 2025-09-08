-- Enable RLS on all tables and create basic policies for authenticated users

-- Enable RLS on all tables
ALTER TABLE public.benutzer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termin_vorlagen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termin_aenderungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter_verfuegbarkeit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitarbeiter_abwesenheiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunden_zeitfenster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create basic policies for authenticated users to read all data
-- (These can be refined later based on specific business rules)

-- Benutzer policies
CREATE POLICY "Authenticated users can read benutzer" ON public.benutzer FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update their own benutzer" ON public.benutzer FOR UPDATE TO authenticated USING (auth.uid()::text = id::text);

-- Kunden policies
CREATE POLICY "Authenticated users can read kunden" ON public.kunden FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kunden" ON public.kunden FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kunden" ON public.kunden FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete kunden" ON public.kunden FOR DELETE TO authenticated USING (true);

-- Mitarbeiter policies
CREATE POLICY "Authenticated users can read mitarbeiter" ON public.mitarbeiter FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mitarbeiter" ON public.mitarbeiter FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mitarbeiter" ON public.mitarbeiter FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mitarbeiter" ON public.mitarbeiter FOR DELETE TO authenticated USING (true);

-- Termine policies
CREATE POLICY "Authenticated users can read termine" ON public.termine FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert termine" ON public.termine FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update termine" ON public.termine FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete termine" ON public.termine FOR DELETE TO authenticated USING (true);

-- Termin_vorlagen policies
CREATE POLICY "Authenticated users can read termin_vorlagen" ON public.termin_vorlagen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert termin_vorlagen" ON public.termin_vorlagen FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update termin_vorlagen" ON public.termin_vorlagen FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete termin_vorlagen" ON public.termin_vorlagen FOR DELETE TO authenticated USING (true);

-- Termin_aenderungen policies
CREATE POLICY "Authenticated users can read termin_aenderungen" ON public.termin_aenderungen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert termin_aenderungen" ON public.termin_aenderungen FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update termin_aenderungen" ON public.termin_aenderungen FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete termin_aenderungen" ON public.termin_aenderungen FOR DELETE TO authenticated USING (true);

-- Mitarbeiter_verfuegbarkeit policies
CREATE POLICY "Authenticated users can read mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mitarbeiter_verfuegbarkeit" ON public.mitarbeiter_verfuegbarkeit FOR DELETE TO authenticated USING (true);

-- Mitarbeiter_abwesenheiten policies
CREATE POLICY "Authenticated users can read mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mitarbeiter_abwesenheiten" ON public.mitarbeiter_abwesenheiten FOR DELETE TO authenticated USING (true);

-- Kunden_zeitfenster policies
CREATE POLICY "Authenticated users can read kunden_zeitfenster" ON public.kunden_zeitfenster FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert kunden_zeitfenster" ON public.kunden_zeitfenster FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update kunden_zeitfenster" ON public.kunden_zeitfenster FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete kunden_zeitfenster" ON public.kunden_zeitfenster FOR DELETE TO authenticated USING (true);

-- Audit_log policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);