-- Korrigiere die benutzer ID für info@kitdienstleistungen.de
-- Der Eintrag existiert mit falscher ID, wir müssen ihn auf die richtige auth.user ID updaten

-- Temporär deaktiviere die unique constraint violation durch Löschen des alten Eintrags
DELETE FROM public.benutzer 
WHERE email = 'info@kitdienstleistungen.de'
  AND id = '8535d047-c9d9-437c-aafe-75b8d655d5c2';

-- Erstelle neuen korrekten Eintrag
INSERT INTO public.benutzer (id, email, vorname, nachname, rolle)
SELECT 
  id,
  email::citext,
  'Ayham',
  'Alkhalil',
  'admin'::user_rolle
FROM auth.users
WHERE email = 'info@kitdienstleistungen.de';