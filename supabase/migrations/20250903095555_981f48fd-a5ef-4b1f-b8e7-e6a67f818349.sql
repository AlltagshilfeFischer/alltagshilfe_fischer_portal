-- Rename German tables to English equivalents to match TypeScript definitions
-- Drop legacy Lovable placeholder tables first (if they exist from base schema migration)
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Rename kunden to customers
ALTER TABLE IF EXISTS public.kunden RENAME TO customers;

-- Rename mitarbeiter to employees
ALTER TABLE IF EXISTS public.mitarbeiter RENAME TO employees;

-- Rename termine to appointments
ALTER TABLE IF EXISTS public.termine RENAME TO appointments;

-- Update foreign key constraints to use new table names
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS termine_kunden_id_fkey,
  DROP CONSTRAINT IF EXISTS termine_mitarbeiter_id_fkey;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (kunden_id) REFERENCES public.customers(id),
  ADD CONSTRAINT appointments_employee_id_fkey FOREIGN KEY (mitarbeiter_id) REFERENCES public.employees(id);

-- PostgreSQL aktualisiert FK-Referenzen bei RENAME TABLE automatisch.
-- Diese UPDATE-Statements werden übersprungen (Tabellen existieren nach RENAME nicht mehr unter altem Namen).