-- Create the missing update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create enum for recurrence intervals
CREATE TYPE public.recurrence_interval AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly');

-- Create table for recurring appointment templates
CREATE TABLE public.termin_vorlagen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  mitarbeiter_id UUID NOT NULL REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  wochentag SMALLINT NOT NULL CHECK (wochentag >= 0 AND wochentag <= 6), -- 0=Sunday, 6=Saturday
  start_zeit TIME NOT NULL,
  dauer_minuten INTEGER NOT NULL DEFAULT 60,
  intervall public.recurrence_interval NOT NULL DEFAULT 'weekly',
  gueltig_von DATE NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis DATE, -- NULL = unbegrenzt
  ist_aktiv BOOLEAN NOT NULL DEFAULT true,
  notizen TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.termin_vorlagen ENABLE ROW LEVEL SECURITY;

-- Create policies for termin_vorlagen
CREATE POLICY "Authenticated employees can manage appointment templates"
ON public.termin_vorlagen
FOR ALL
USING (is_authenticated_employee())
WITH CHECK (is_authenticated_employee());

-- Create indexes for better performance
CREATE INDEX idx_termin_vorlagen_kunde ON public.termin_vorlagen(kunden_id);
CREATE INDEX idx_termin_vorlagen_mitarbeiter ON public.termin_vorlagen(mitarbeiter_id);
CREATE INDEX idx_termin_vorlagen_aktiv ON public.termin_vorlagen(ist_aktiv) WHERE ist_aktiv = true;
CREATE INDEX idx_termin_vorlagen_wochentag ON public.termin_vorlagen(wochentag);

-- Add trigger for updated_at
CREATE TRIGGER update_termin_vorlagen_updated_at
  BEFORE UPDATE ON public.termin_vorlagen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate appointments from templates
CREATE OR REPLACE FUNCTION public.generate_termine_from_vorlagen(
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT CURRENT_DATE + INTERVAL '4 weeks'
)
RETURNS INTEGER AS $$
DECLARE
  vorlage RECORD;
  target_date DATE;
  generated_count INTEGER := 0;
BEGIN
  -- Loop through all active templates
  FOR vorlage IN 
    SELECT * FROM public.termin_vorlagen 
    WHERE ist_aktiv = true 
    AND gueltig_von <= end_date 
    AND (gueltig_bis IS NULL OR gueltig_bis >= start_date)
  LOOP
    -- Calculate target dates based on recurrence interval
    target_date := start_date;
    
    WHILE target_date <= end_date LOOP
      -- Check if this date matches the template's day of week
      IF EXTRACT(DOW FROM target_date) = vorlage.wochentag THEN
        -- Check if date is within template validity period
        IF target_date >= vorlage.gueltig_von AND 
           (vorlage.gueltig_bis IS NULL OR target_date <= vorlage.gueltig_bis) THEN
          
          -- Check if appointment doesn't already exist
          IF NOT EXISTS (
            SELECT 1 FROM public.termine 
            WHERE kunden_id = vorlage.kunden_id 
            AND mitarbeiter_id = vorlage.mitarbeiter_id
            AND start_at::date = target_date
          ) THEN
            -- Create the appointment
            INSERT INTO public.termine (
              kunden_id, 
              mitarbeiter_id, 
              titel, 
              start_at, 
              end_at,
              status
            ) VALUES (
              vorlage.kunden_id,
              vorlage.mitarbeiter_id,
              vorlage.titel,
              target_date + vorlage.start_zeit,
              target_date + vorlage.start_zeit + (vorlage.dauer_minuten || ' minutes')::INTERVAL,
              'scheduled'
            );
            
            generated_count := generated_count + 1;
          END IF;
        END IF;
      END IF;
      
      -- Move to next date based on interval
      CASE vorlage.intervall
        WHEN 'weekly' THEN
          target_date := target_date + INTERVAL '1 week';
        WHEN 'biweekly' THEN
          target_date := target_date + INTERVAL '2 weeks';
        WHEN 'monthly' THEN
          target_date := target_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
          target_date := target_date + INTERVAL '3 months';
      END CASE;
    END LOOP;
  END LOOP;
  
  RETURN generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;