-- =============================================================================
-- ELOQUENCE '26 SYMPOSIUM MCQ / ONLINE QUIZ EXAMINATION SYSTEM
-- DATABASE GRANTS & ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- 1. Grant schema and table permissions to database roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Enable RLS on all tables with API backend access policies
DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Allow backend API access on %I" ON public.%I;', tbl.tablename, tbl.tablename);
        EXECUTE format('CREATE POLICY "Allow backend API access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl.tablename, tbl.tablename);
    END LOOP;
END $$;
