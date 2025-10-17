-- Add vorname and nachname to mitarbeiter table
ALTER TABLE public.mitarbeiter 
ADD COLUMN vorname text,
ADD COLUMN nachname text;

-- Copy existing names from benutzer to mitarbeiter
UPDATE public.mitarbeiter m
SET 
  vorname = b.vorname,
  nachname = b.nachname
FROM public.benutzer b
WHERE m.benutzer_id = b.id;

-- Create function to sync names from benutzer to mitarbeiter
CREATE OR REPLACE FUNCTION public.sync_mitarbeiter_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update mitarbeiter name when benutzer name changes
  UPDATE public.mitarbeiter
  SET 
    vorname = NEW.vorname,
    nachname = NEW.nachname
  WHERE benutzer_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on benutzer table to sync names
CREATE TRIGGER sync_mitarbeiter_name_trigger
AFTER INSERT OR UPDATE OF vorname, nachname ON public.benutzer
FOR EACH ROW
EXECUTE FUNCTION public.sync_mitarbeiter_name();