-- Füge INSERT Policy für benutzer hinzu (für Service Role im Edge Function)
-- Die Service Role kann RLS umgehen, aber wir fügen trotzdem eine explizite Policy hinzu
DROP POLICY IF EXISTS "Service role can insert benutzer" ON public.benutzer;
CREATE POLICY "Service role can insert benutzer"
ON public.benutzer
FOR INSERT
TO service_role
WITH CHECK (true);

-- Füge INSERT Policy für mitarbeiter hinzu (für Service Role im Edge Function)
DROP POLICY IF EXISTS "Service role can insert mitarbeiter" ON public.mitarbeiter;
CREATE POLICY "Service role can insert mitarbeiter"
ON public.mitarbeiter
FOR INSERT
TO service_role
WITH CHECK (true);