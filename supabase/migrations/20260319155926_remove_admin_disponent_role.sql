-- Migration: Remove "admin" (Disponent) role
-- All existing admin users are migrated to geschaeftsfuehrer.
-- PostgreSQL ENUM values cannot be removed, so 'admin' stays in the enum
-- but is never assigned or checked anymore.

BEGIN;

-- 1. Migrate existing admin users in user_roles to geschaeftsfuehrer
UPDATE public.user_roles
SET role = 'geschaeftsfuehrer'
WHERE role = 'admin';

-- 2. Migrate benutzer table if it has a rolle column referencing admin
UPDATE public.benutzer
SET rolle = 'geschaeftsfuehrer'
WHERE rolle = 'admin';

-- 3. Update is_admin() to NOT check for 'admin' anymore
-- NOTE: Keep param name _user_id to match existing function signature (avoids DROP + RLS cascade)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND role IN ('globaladmin', 'geschaeftsfuehrer')
  );
END;
$$;

-- 4. Update is_admin_secure() to NOT check for 'admin'
CREATE OR REPLACE FUNCTION public.is_admin_secure(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND role IN ('globaladmin', 'geschaeftsfuehrer')
  );
END;
$$;

-- 5. Update is_admin_or_higher() to NOT check for 'admin'
CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND role IN ('globaladmin', 'geschaeftsfuehrer')
  );
END;
$$;

-- 6. Update get_user_rolle() to never return 'admin'
CREATE OR REPLACE FUNCTION public.get_user_rolle(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  ORDER BY
    CASE role
      WHEN 'globaladmin' THEN 1
      WHEN 'geschaeftsfuehrer' THEN 2
      WHEN 'buchhaltung' THEN 3
      WHEN 'mitarbeiter' THEN 4
      ELSE 5
    END
  LIMIT 1;

  RETURN COALESCE(v_role, 'none');
END;
$$;

COMMIT;
