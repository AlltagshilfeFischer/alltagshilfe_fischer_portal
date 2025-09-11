-- Remove the trigger that's preventing simple employee assignments
-- This trigger was checking time windows during assignment, but we only want 
-- employee assignment without time changes

DROP TRIGGER IF EXISTS validate_termin_zeitfenster ON public.termine;