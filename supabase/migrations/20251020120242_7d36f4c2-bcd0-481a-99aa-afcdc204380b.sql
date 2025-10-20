-- Fix foreign key constraint to allow mitarbeiter deletion
-- When a mitarbeiter is deleted, set kunden.mitarbeiter to NULL instead of blocking

ALTER TABLE public.kunden 
DROP CONSTRAINT IF EXISTS kunden_mitarbeiter_fkey;

ALTER TABLE public.kunden
ADD CONSTRAINT kunden_mitarbeiter_fkey 
FOREIGN KEY (mitarbeiter) 
REFERENCES public.mitarbeiter(id) 
ON DELETE SET NULL;