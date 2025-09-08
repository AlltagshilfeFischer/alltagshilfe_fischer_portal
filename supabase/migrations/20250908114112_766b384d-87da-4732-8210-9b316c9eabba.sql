-- Check current RLS policies and grant permissions
-- Grant usage on public schema to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select permissions on all tables to anon for public access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant full permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Also grant permissions on sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;