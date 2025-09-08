-- Function to generate appointments from templates
CREATE OR REPLACE FUNCTION public.generate_termine_from_vorlagen(
  p_from DATE,
  p_to DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_rec RECORD;
  iter_date DATE;
  appointment_start TIMESTAMP WITH TIME ZONE;
  appointment_end TIMESTAMP WITH TIME ZONE;
  created_count INTEGER := 0;
  interval_days INTEGER;
BEGIN
  -- Loop through active templates
  FOR template_rec IN 
    SELECT * FROM public.termin_vorlagen 
    WHERE ist_aktiv = true 
      AND gueltig_von <= p_to 
      AND (gueltig_bis IS NULL OR gueltig_bis >= p_from)
  LOOP
    -- Determine interval in days
    interval_days := CASE template_rec.intervall
      WHEN 'weekly' THEN 7
      WHEN 'biweekly' THEN 14
      WHEN 'monthly' THEN 30
      ELSE 7
    END;
    
    -- Generate appointments for the date range
    iter_date := GREATEST(p_from, template_rec.gueltig_von);
    
    WHILE iter_date <= LEAST(p_to, COALESCE(template_rec.gueltig_bis, p_to)) LOOP
      -- Check if this is the correct day of week
      IF EXTRACT(DOW FROM iter_date)::SMALLINT = template_rec.wochentag THEN
        appointment_start := iter_date + template_rec.start_zeit;
        appointment_end := appointment_start + (template_rec.dauer_minuten || ' minutes')::INTERVAL;
        
        -- Check if appointment doesn't already exist
        IF NOT EXISTS (
          SELECT 1 FROM public.termine t
          WHERE t.kunden_id = template_rec.kunden_id
            AND t.start_at = appointment_start
            AND t.end_at = appointment_end
        ) THEN
          -- Insert new appointment
          INSERT INTO public.termine (
            titel,
            kunden_id,
            mitarbeiter_id,
            start_at,
            end_at,
            status
          ) VALUES (
            template_rec.titel,
            template_rec.kunden_id,
            template_rec.mitarbeiter_id,
            appointment_start,
            appointment_end,
            CASE WHEN template_rec.mitarbeiter_id IS NULL THEN 'unassigned' ELSE 'scheduled' END
          );
          
          created_count := created_count + 1;
        END IF;
      END IF;
      
      iter_date := iter_date + interval_days;
    END LOOP;
  END LOOP;
  
  RETURN created_count;
END;
$$;