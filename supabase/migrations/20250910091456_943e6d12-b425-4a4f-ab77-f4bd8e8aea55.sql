-- Create time windows for the new dummy customers
-- Insert customer time windows for Max Mustermann (weekdays 9-17)
INSERT INTO public.kunden_zeitfenster (kunden_id, wochentag, von, bis, prioritaet)
SELECT 
  k.id,
  dow,
  '09:00'::time,
  '17:00'::time,
  1
FROM public.kunden k
CROSS JOIN generate_series(1, 5) as dow
WHERE k.email IN ('max.mustermann@email.com', 'anna.schmidt@email.com', 'peter.weber@email.com', 'lisa.meyer@email.com', 'thomas.mueller@email.com')
ON CONFLICT DO NOTHING;

-- Also create some weekend availability for testing
INSERT INTO public.kunden_zeitfenster (kunden_id, wochentag, von, bis, prioritaet)
SELECT 
  k.id,
  6, -- Saturday
  '10:00'::time,
  '14:00'::time,
  2
FROM public.kunden k
WHERE k.email IN ('max.mustermann@email.com', 'anna.schmidt@email.com')
ON CONFLICT DO NOTHING;