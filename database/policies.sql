-- =============================================================================
-- ELOQUENCE '26 SYMPOSIUM MCQ / ONLINE QUIZ EXAMINATION SYSTEM
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. USERS & PROFILES POLICIES
CREATE POLICY "Users can read own record" ON public.users
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. PARTICIPANTS POLICIES
CREATE POLICY "Participants can read own record" ON public.participants
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins have full access to participants" ON public.participants
    FOR ALL USING (public.is_admin());

-- 3. ADMINS POLICIES
CREATE POLICY "Admins can view admins" ON public.admins
    FOR SELECT USING (public.is_admin());

-- 4. EVENTS & ROUNDS POLICIES
CREATE POLICY "Anyone authenticated can view active events" ON public.events
    FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins manage events" ON public.events
    FOR ALL USING (public.is_admin());

CREATE POLICY "Anyone authenticated can view active rounds" ON public.rounds
    FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins manage rounds" ON public.rounds
    FOR ALL USING (public.is_admin());

-- 5. QUIZZES POLICIES
CREATE POLICY "Participants see published quizzes assigned to them" ON public.quizzes
    FOR SELECT USING (
        public.is_admin() OR (
            status IN ('Published', 'Live', 'Completed') AND
            EXISTS (
                SELECT 1 FROM public.quiz_assignments qa
                WHERE qa.quiz_id = quizzes.id AND qa.participant_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins manage quizzes" ON public.quizzes
    FOR ALL USING (public.is_admin());

-- 6. QUESTIONS POLICIES (Never let participants query questions directly with answers)
CREATE POLICY "Admins manage questions" ON public.questions
    FOR ALL USING (public.is_admin());

-- 7. QUIZ QUESTIONS
CREATE POLICY "Admins manage quiz questions" ON public.quiz_questions
    FOR ALL USING (public.is_admin());

-- 8. QUIZ ASSIGNMENTS
CREATE POLICY "Participants view own assignments" ON public.quiz_assignments
    FOR SELECT USING (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage assignments" ON public.quiz_assignments
    FOR ALL USING (public.is_admin());

-- 9. EXAM ATTEMPTS
CREATE POLICY "Participants view own attempts" ON public.exam_attempts
    FOR SELECT USING (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants can insert own attempt" ON public.exam_attempts
    FOR INSERT WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Participants can update own in-progress attempt" ON public.exam_attempts
    FOR UPDATE USING (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage attempts" ON public.exam_attempts
    FOR ALL USING (public.is_admin());

-- 10. ATTEMPT ANSWERS
CREATE POLICY "Participants view own attempt answers" ON public.attempt_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            WHERE ea.id = attempt_answers.attempt_id AND ea.participant_id = auth.uid()
        ) OR public.is_admin()
    );

CREATE POLICY "Participants save own attempt answers" ON public.attempt_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            WHERE ea.id = attempt_answers.attempt_id AND ea.participant_id = auth.uid()
        ) OR public.is_admin()
    );

-- 11. RESULTS
CREATE POLICY "Participants view own published results" ON public.results
    FOR SELECT USING (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage results" ON public.results
    FOR ALL USING (public.is_admin());

-- 12. SECURITY VIOLATIONS
CREATE POLICY "Participants can log security violations" ON public.security_violations
    FOR INSERT WITH CHECK (participant_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can view security violations" ON public.security_violations
    FOR SELECT USING (public.is_admin());

-- 13. ANNOUNCEMENTS
CREATE POLICY "Everyone can read active announcements" ON public.announcements
    FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins manage announcements" ON public.announcements
    FOR ALL USING (public.is_admin());

-- 14. SETTINGS
CREATE POLICY "Read system settings" ON public.system_settings
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins update system settings" ON public.system_settings
    FOR ALL USING (public.is_admin());
