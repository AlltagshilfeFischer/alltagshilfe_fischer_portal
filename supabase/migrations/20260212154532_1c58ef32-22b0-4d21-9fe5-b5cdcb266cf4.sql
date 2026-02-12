
-- SCHRITT 1: Nur Enum-Werte hinzufügen (muss committed werden bevor sie nutzbar sind)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'globaladmin';
ALTER TYPE public.user_rolle ADD VALUE IF NOT EXISTS 'globaladmin';
