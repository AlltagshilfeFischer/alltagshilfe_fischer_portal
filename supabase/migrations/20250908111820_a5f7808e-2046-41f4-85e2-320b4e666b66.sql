-- Create a test user for authentication
-- Note: This creates a user in the benutzer table but for Supabase auth,
-- users need to be created through the auth system

-- For now, let's allow public read access to essential tables for testing
-- You can tighten these policies later

-- Allow public read access to basic data for testing
CREATE POLICY "Public can read mitarbeiter" ON public.mitarbeiter FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read kunden" ON public.kunden FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read termine" ON public.termine FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read termin_aenderungen" ON public.termin_aenderungen FOR SELECT TO anon USING (true);

-- Also allow authenticated users to modify data
CREATE POLICY "Authenticated can modify termine" ON public.termine FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can modify termin_aenderungen" ON public.termin_aenderungen FOR ALL TO authenticated USING (true) WITH CHECK (true);