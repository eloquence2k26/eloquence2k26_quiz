-- Eloquence 2K26 Symposium Quiz Event Management & Security System Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'Active',
  quizzes_attempted INT DEFAULT 0,
  score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quizzes Table (Full Symposium Event Settings)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_id TEXT DEFAULT 'evt_eloquence_2026',
  category TEXT DEFAULT 'General Technology',
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  duration INT DEFAULT 30, -- In minutes
  max_participants INT DEFAULT 100,
  total_questions INT DEFAULT 30,
  marks_per_question NUMERIC DEFAULT 1,
  negative_marking BOOLEAN DEFAULT false,
  negative_marks_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Published', -- 'Draft', 'Published', 'Scheduled', 'Live', 'Closed'
  instructions TEXT,
  max_attempts INT DEFAULT 1,
  
  -- Security Settings
  strict_mode BOOLEAN DEFAULT true,
  fullscreen_required BOOLEAN DEFAULT true,
  detect_visibility_change BOOLEAN DEFAULT true,
  detect_tab_switch BOOLEAN DEFAULT true,
  detect_focus_loss BOOLEAN DEFAULT true,
  detect_fullscreen_exit BOOLEAN DEFAULT true,
  max_violations INT DEFAULT 3,
  violation_action TEXT DEFAULT 'lock', -- 'lock' or 'auto_submit'
  
  -- Result & Retest Settings
  show_score BOOLEAN DEFAULT true,
  show_correct_answers BOOLEAN DEFAULT false,
  show_ranking BOOLEAN DEFAULT false,
  allow_retest BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Quiz Questions Table (Inside Quiz ONLY, 2/3/4 MCQ Options)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  options_count INT DEFAULT 4, -- 2, 3, or 4 options
  correct_answer VARCHAR(2) NOT NULL DEFAULT 'A', -- 'A', 'B', 'C', 'D'
  marks NUMERIC DEFAULT 1,
  negative_marks NUMERIC DEFAULT 0,
  question_image TEXT,
  explanation TEXT,
  question_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quiz Registrations & Access Table (Per Participant Per Quiz)
CREATE TABLE IF NOT EXISTS public.quiz_registrations (
  id TEXT PRIMARY KEY,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  registration_status TEXT DEFAULT 'Approved', -- 'Pending', 'Approved', 'Rejected'
  access_status TEXT DEFAULT 'Granted', -- 'Granted', 'Revoked'
  qualification_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'QUALIFIED', 'ELIMINATED'
  next_round_quiz_id TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, participant_id)
);

-- 5. Quiz Attempts Table (Server-Authoritative)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  attempt_number INT DEFAULT 1,
  status TEXT DEFAULT 'IN_PROGRESS', -- 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'TERMINATED'
  qualification_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'QUALIFIED', 'ELIMINATED'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC DEFAULT 0,
  total_marks NUMERIC DEFAULT 0,
  violations_count INT DEFAULT 0,
  retest_allowed BOOLEAN DEFAULT false
);

-- 6. Attempt Answers Table
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer VARCHAR(2),
  is_correct BOOLEAN DEFAULT false,
  marks_awarded NUMERIC DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Quiz Violations Table (Security Audit Log)
CREATE TABLE IF NOT EXISTS public.quiz_violations (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  violation_type TEXT NOT NULL, -- 'visibility_hidden', 'window_blur', 'fullscreen_exit', 'tab_switch', 'copy_attempt', 'context_menu'
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'WARNING' -- 'WARNING', 'TERMINATION'
);

-- 8. Retest Permissions Table (Admin Approvals)
CREATE TABLE IF NOT EXISTS public.retest_permissions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  granted_by TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'granted', -- 'pending', 'granted', 'denied'
  reason TEXT,
  admin_message TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Migration Block for Pre-existing Tables
DO $$ 
BEGIN 
  -- 1. Ensure participant_id exists on quiz_registrations (rename from user_id if present)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_registrations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_registrations' AND column_name='participant_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_registrations' AND column_name='user_id') THEN
        ALTER TABLE public.quiz_registrations RENAME COLUMN user_id TO participant_id;
      ELSE
        ALTER TABLE public.quiz_registrations ADD COLUMN participant_id TEXT NOT NULL DEFAULT '';
      END IF;
    END IF;
  END IF;

  -- 2. Ensure participant_id exists on quiz_attempts (rename from user_id if present)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_attempts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='participant_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='user_id') THEN
        ALTER TABLE public.quiz_attempts RENAME COLUMN user_id TO participant_id;
      ELSE
        ALTER TABLE public.quiz_attempts ADD COLUMN participant_id TEXT NOT NULL DEFAULT '';
      END IF;
    END IF;
  END IF;

  -- 3. Ensure participant_id exists on quiz_violations (rename from user_id if present)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_violations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_violations' AND column_name='participant_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_violations' AND column_name='user_id') THEN
        ALTER TABLE public.quiz_violations RENAME COLUMN user_id TO participant_id;
      ELSE
        ALTER TABLE public.quiz_violations ADD COLUMN participant_id TEXT NOT NULL DEFAULT '';
      END IF;
    END IF;
  END IF;

  -- 4. Ensure participant_id exists on retest_permissions (rename from user_id if present)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='retest_permissions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retest_permissions' AND column_name='participant_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retest_permissions' AND column_name='user_id') THEN
        ALTER TABLE public.retest_permissions RENAME COLUMN user_id TO participant_id;
      ELSE
        ALTER TABLE public.retest_permissions ADD COLUMN participant_id TEXT NOT NULL DEFAULT '';
      END IF;
    END IF;
  END IF;
END $$;

-- Grants & Permissions
GRANT ALL PRIVILEGES ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quizzes TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quiz_questions TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quiz_registrations TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quiz_attempts TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.attempt_answers TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quiz_violations TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.retest_permissions TO anon, authenticated, service_role;

-- Enable RLS & Permissive Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retest_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access users" ON public.users;
CREATE POLICY "Allow public access users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access quizzes" ON public.quizzes;
CREATE POLICY "Allow public access quizzes" ON public.quizzes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access quiz_questions" ON public.quiz_questions;
CREATE POLICY "Allow public access quiz_questions" ON public.quiz_questions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access quiz_registrations" ON public.quiz_registrations;
CREATE POLICY "Allow public access quiz_registrations" ON public.quiz_registrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "Allow public access quiz_attempts" ON public.quiz_attempts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access attempt_answers" ON public.attempt_answers;
CREATE POLICY "Allow public access attempt_answers" ON public.attempt_answers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access quiz_violations" ON public.quiz_violations;
CREATE POLICY "Allow public access quiz_violations" ON public.quiz_violations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public access retest_permissions" ON public.retest_permissions;
CREATE POLICY "Allow public access retest_permissions" ON public.retest_permissions FOR ALL USING (true);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_quizzes_event ON public.quizzes(event_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_quiz ON public.quiz_registrations(participant_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_quiz ON public.quiz_attempts(participant_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_violations_attempt ON public.quiz_violations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_retest_user_quiz ON public.retest_permissions(participant_id, quiz_id);
