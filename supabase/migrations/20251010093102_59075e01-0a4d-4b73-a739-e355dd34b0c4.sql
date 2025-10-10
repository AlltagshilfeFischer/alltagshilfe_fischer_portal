-- Ensure required schema and function privileges for Edge Function RPCs
DO $$
BEGIN
  -- Grant USAGE on public schema (safe if already granted)
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
EXCEPTION WHEN OTHERS THEN
  -- ignore if grants already exist
  NULL;
END $$;

-- Grant EXECUTE on security definer functions used by the edge function
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_pending_registration(uuid) TO anon, authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_registration_status(uuid, uuid) TO authenticated, service_role';
  -- Ensure admin check function is callable by authenticated users
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;