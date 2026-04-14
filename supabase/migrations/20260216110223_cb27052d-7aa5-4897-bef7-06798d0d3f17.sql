
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_generic_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (operation, table_name, row_id, new_data, actor_benutzer_id)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (operation, table_name, row_id, old_data, new_data, actor_benutzer_id)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (operation, table_name, row_id, old_data, actor_benutzer_id)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit triggers for all important tables
DROP TRIGGER IF EXISTS audit_mitarbeiter ON public.mitarbeiter;
CREATE TRIGGER audit_mitarbeiter
  AFTER INSERT OR UPDATE OR DELETE ON public.mitarbeiter
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_kunden ON public.kunden;
CREATE TRIGGER audit_kunden
  AFTER INSERT OR UPDATE OR DELETE ON public.kunden
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_benutzer ON public.benutzer;
CREATE TRIGGER audit_benutzer
  AFTER INSERT OR UPDATE OR DELETE ON public.benutzer
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_termine ON public.termine;
CREATE TRIGGER audit_termine
  AFTER INSERT OR UPDATE OR DELETE ON public.termine
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_leistungsnachweise ON public.leistungsnachweise;
CREATE TRIGGER audit_leistungsnachweise
  AFTER INSERT OR UPDATE OR DELETE ON public.leistungsnachweise
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_dokumente ON public.dokumente;
CREATE TRIGGER audit_dokumente
  AFTER INSERT OR UPDATE OR DELETE ON public.dokumente
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_haushalte ON public.haushalte;
CREATE TRIGGER audit_haushalte
  AFTER INSERT OR UPDATE OR DELETE ON public.haushalte
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_leistungen ON public.leistungen;
CREATE TRIGGER audit_leistungen
  AFTER INSERT OR UPDATE OR DELETE ON public.leistungen
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_mitarbeiter ON public.mitarbeiter;
DROP TRIGGER IF EXISTS audit_mitarbeiter_abwesenheiten ON public.mitarbeiter_abwesenheiten;
CREATE TRIGGER audit_mitarbeiter_abwesenheiten
  AFTER INSERT OR UPDATE OR DELETE ON public.mitarbeiter_abwesenheiten
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_termin_vorlagen ON public.termin_vorlagen;
CREATE TRIGGER audit_termin_vorlagen
  AFTER INSERT OR UPDATE OR DELETE ON public.termin_vorlagen
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();

DROP TRIGGER IF EXISTS audit_rechnungen ON public.rechnungen;
CREATE TRIGGER audit_rechnungen
  AFTER INSERT OR UPDATE OR DELETE ON public.rechnungen
  FOR EACH ROW EXECUTE FUNCTION public.log_generic_audit();
