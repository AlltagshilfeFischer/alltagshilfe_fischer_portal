-- Create missing foreign key constraints for termin_aenderungen table
-- These foreign keys are needed for proper data relationships and PostgREST queries

-- Add foreign key constraints to termin_aenderungen table (idempotent)
ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_termin_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_termin_id_fkey FOREIGN KEY (termin_id) REFERENCES public.termine(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_requested_by_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.benutzer(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_approver_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.benutzer(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_old_kunden_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_old_kunden_id_fkey FOREIGN KEY (old_kunden_id) REFERENCES public.kunden(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_new_kunden_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_new_kunden_id_fkey FOREIGN KEY (new_kunden_id) REFERENCES public.kunden(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_old_mitarbeiter_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_old_mitarbeiter_id_fkey FOREIGN KEY (old_mitarbeiter_id) REFERENCES public.mitarbeiter(id);

ALTER TABLE public.termin_aenderungen DROP CONSTRAINT IF EXISTS termin_aenderungen_new_mitarbeiter_id_fkey;
ALTER TABLE public.termin_aenderungen ADD CONSTRAINT termin_aenderungen_new_mitarbeiter_id_fkey FOREIGN KEY (new_mitarbeiter_id) REFERENCES public.mitarbeiter(id);

-- Also add missing foreign keys for other tables to ensure data integrity
ALTER TABLE public.termine DROP CONSTRAINT IF EXISTS termine_kunden_id_fkey;
ALTER TABLE public.termine ADD CONSTRAINT termine_kunden_id_fkey FOREIGN KEY (kunden_id) REFERENCES public.kunden(id);

ALTER TABLE public.termine DROP CONSTRAINT IF EXISTS termine_mitarbeiter_id_fkey;
ALTER TABLE public.termine ADD CONSTRAINT termine_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);

ALTER TABLE public.mitarbeiter DROP CONSTRAINT IF EXISTS mitarbeiter_benutzer_id_fkey;
ALTER TABLE public.mitarbeiter ADD CONSTRAINT mitarbeiter_benutzer_id_fkey FOREIGN KEY (benutzer_id) REFERENCES public.benutzer(id);

ALTER TABLE public.mitarbeiter_abwesenheiten DROP CONSTRAINT IF EXISTS mitarbeiter_abwesenheiten_mitarbeiter_id_fkey;
ALTER TABLE public.mitarbeiter_abwesenheiten ADD CONSTRAINT mitarbeiter_abwesenheiten_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);

ALTER TABLE public.mitarbeiter_verfuegbarkeit DROP CONSTRAINT IF EXISTS mitarbeiter_verfuegbarkeit_mitarbeiter_id_fkey;
ALTER TABLE public.mitarbeiter_verfuegbarkeit ADD CONSTRAINT mitarbeiter_verfuegbarkeit_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);

ALTER TABLE public.kunden_zeitfenster DROP CONSTRAINT IF EXISTS kunden_zeitfenster_kunden_id_fkey;
ALTER TABLE public.kunden_zeitfenster ADD CONSTRAINT kunden_zeitfenster_kunden_id_fkey FOREIGN KEY (kunden_id) REFERENCES public.kunden(id);

ALTER TABLE public.termin_vorlagen DROP CONSTRAINT IF EXISTS termin_vorlagen_kunden_id_fkey;
ALTER TABLE public.termin_vorlagen ADD CONSTRAINT termin_vorlagen_kunden_id_fkey FOREIGN KEY (kunden_id) REFERENCES public.kunden(id);

ALTER TABLE public.termin_vorlagen DROP CONSTRAINT IF EXISTS termin_vorlagen_mitarbeiter_id_fkey;
ALTER TABLE public.termin_vorlagen ADD CONSTRAINT termin_vorlagen_mitarbeiter_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.mitarbeiter(id);
