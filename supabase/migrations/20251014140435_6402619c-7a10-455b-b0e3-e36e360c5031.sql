-- Lösche die verwaisten Admin-Einträge aus der mitarbeiter Tabelle
-- Diese User sind Admins und sollten nicht in der mitarbeiter Tabelle sein
DELETE FROM public.mitarbeiter 
WHERE id IN ('f909881e-c4c1-4f37-b629-0677566f9918', '290acb50-bf60-481c-a704-d8bfbd136024');