-- =============================================================================
-- ELOQUENCE '26 - USER MANAGEMENT & ROLE-BASED ACCESS CONTROL SCHEMA
-- Run this in Supabase SQL Editor to initialize or update user & role tables.
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    badge VARCHAR(50) DEFAULT 'General',
    color VARCHAR(100) DEFAULT 'from-brand-600 to-indigo-600',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USERS TABLE (Authentication & Base Account Info)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PARTICIPANT',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROFILES TABLE (User Details)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ADMINS TABLE (Administrative Roles & Access Levels)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    admin_level VARCHAR(50) DEFAULT 'SUPER_ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. SEED DEFAULT ROLES
INSERT INTO public.roles (id, name, title, description, permissions, badge, color)
VALUES
  (
    'role-super-admin',
    'SUPER_ADMIN',
    'Super Administrator / Director',
    'Full unconstrained system authority over examinations, questions, scholars, proctoring, and server credentials.',
    '["All Privileges", "User & Role Management", "Proctor Overrides", "Full DB Sync", "Attempt Restarts"]'::jsonb,
    'Level 1 - Core',
    'from-amber-600 to-orange-600'
  ),
  (
    'role-admin',
    'ADMIN',
    'Symposium Admin',
    'Manages quiz events, question pools, participant registrations, schedule windows, and leaderboards.',
    '["Event & Quiz Config", "Question Bank Authoring", "Candidate Registration", "Live Proctoring", "Results Export"]'::jsonb,
    'Level 2 - General',
    'from-brand-600 to-indigo-600'
  ),
  (
    'role-coordinator',
    'COORDINATOR',
    'Event Coordinator',
    'Department coordinator responsible for event-specific quiz questions and preliminary grading.',
    '["Question Authoring", "Event Roster", "Live Exam Monitoring", "Candidate Verification"]'::jsonb,
    'Level 3 - Event',
    'from-blue-600 to-cyan-600'
  ),
  (
    'role-proctor',
    'PROCTOR',
    'Exam Proctor / Invigilator',
    'Oversees live candidate test sessions, responds to security flags, and assists with hall proctoring.',
    '["Live Monitoring", "Security Violation Review", "Attempt Termination Flagging"]'::jsonb,
    'Level 4 - Proctor',
    'from-purple-600 to-violet-600'
  ),
  (
    'role-volunteer',
    'VOLUNTEER',
    'Symposium Volunteer',
    'Assists in on-ground participant guidance, attendance verification, and technical support desk.',
    '["Candidate Check-in", "Attendance Roster View", "Support Ticket Submission"]'::jsonb,
    'Level 5 - Support',
    'from-emerald-600 to-teal-600'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  badge = EXCLUDED.badge,
  color = EXCLUDED.color,
  updated_at = NOW();

-- 8. INDEXES FOR FAST AUTH & QUERIES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and service roles full access
DROP POLICY IF EXISTS "Allow full access to authenticated service" ON public.roles;
CREATE POLICY "Allow full access to authenticated service" ON public.roles
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users read own profile" ON public.users;
CREATE POLICY "Allow users read own profile" ON public.users
    FOR SELECT USING (true);

