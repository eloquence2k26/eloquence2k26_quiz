-- =============================================================================
-- ELOQUENCE '26 SYMPOSIUM MCQ / ONLINE QUIZ EXAMINATION SYSTEM
-- DATABASE FUNCTIONS & STORED PROCEDURES
-- =============================================================================

-- 1. Function to Calculate Results and Ranks for a Quiz Attempt
CREATE OR REPLACE FUNCTION public.calculate_attempt_result(p_attempt_id UUID)
RETURNS public.results AS $$
DECLARE
    v_attempt public.exam_attempts%ROWTYPE;
    v_quiz public.quizzes%ROWTYPE;
    v_total_questions INT;
    v_attempted_questions INT := 0;
    v_correct_answers INT := 0;
    v_wrong_answers INT := 0;
    v_unanswered INT := 0;
    v_positive_marks NUMERIC(10, 2) := 0.00;
    v_negative_marks NUMERIC(10, 2) := 0.00;
    v_final_score NUMERIC(10, 2) := 0.00;
    v_percentage NUMERIC(5, 2) := 0.00;
    v_is_passed BOOLEAN := FALSE;
    v_time_taken INT := 0;
    v_result public.results;
    v_record RECORD;
BEGIN
    SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = p_attempt_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found with ID %', p_attempt_id;
    END IF;

    SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

    -- Calculate total questions in quiz
    SELECT COUNT(*) INTO v_total_questions FROM public.quiz_questions WHERE quiz_id = v_attempt.quiz_id;

    -- Iterate through answers and calculate score
    FOR v_record IN (
        SELECT 
            aa.selected_option,
            q.correct_answer,
            COALESCE(q.marks, 1.00) as question_marks,
            COALESCE(
                CASE WHEN v_quiz.negative_marking THEN v_quiz.negative_mark_value ELSE q.negative_marks END,
                0.00
            ) as question_neg_marks
        FROM public.quiz_questions qq
        JOIN public.questions q ON qq.question_id = q.id
        LEFT JOIN public.attempt_answers aa ON aa.question_id = q.id AND aa.attempt_id = p_attempt_id
        WHERE qq.quiz_id = v_attempt.quiz_id
    ) LOOP
        IF v_record.selected_option IS NOT NULL AND TRIM(v_record.selected_option) != '' THEN
            v_attempted_questions := v_attempted_questions + 1;
            IF UPPER(TRIM(v_record.selected_option)) = UPPER(TRIM(v_record.correct_answer)) THEN
                v_correct_answers := v_correct_answers + 1;
                v_positive_marks := v_positive_marks + v_record.question_marks;
            ELSE
                v_wrong_answers := v_wrong_answers + 1;
                v_negative_marks := v_negative_marks + v_record.question_neg_marks;
            END IF;
        END IF;
    END LOOP;

    v_unanswered := GREATEST(0, v_total_questions - v_attempted_questions);
    v_final_score := GREATEST(0.00, v_positive_marks - v_negative_marks);
    
    IF v_quiz.max_marks > 0 THEN
        v_percentage := ROUND((v_final_score / v_quiz.max_marks) * 100.0, 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    v_is_passed := (v_percentage >= v_quiz.pass_percentage);
    
    IF v_attempt.submitted_at IS NOT NULL AND v_attempt.started_at IS NOT NULL THEN
        v_time_taken := EXTRACT(EPOCH FROM (v_attempt.submitted_at - v_attempt.started_at))::INT;
    ELSE
        v_time_taken := EXTRACT(EPOCH FROM (NOW() - v_attempt.started_at))::INT;
    END IF;

    -- Upsert result record
    INSERT INTO public.results (
        attempt_id, quiz_id, participant_id, total_questions, attempted_questions,
        correct_answers, wrong_answers, unanswered_questions, positive_marks,
        negative_marks, final_score, percentage, is_passed, time_taken_seconds, status
    ) VALUES (
        p_attempt_id, v_attempt.quiz_id, v_attempt.participant_id, v_total_questions,
        v_attempted_questions, v_correct_answers, v_wrong_answers, v_unanswered,
        v_positive_marks, v_negative_marks, v_final_score, v_percentage,
        v_is_passed, v_time_taken, v_attempt.status
    )
    ON CONFLICT (attempt_id) DO UPDATE SET
        total_questions = EXCLUDED.total_questions,
        attempted_questions = EXCLUDED.attempted_questions,
        correct_answers = EXCLUDED.correct_answers,
        wrong_answers = EXCLUDED.wrong_answers,
        unanswered_questions = EXCLUDED.unanswered_questions,
        positive_marks = EXCLUDED.positive_marks,
        negative_marks = EXCLUDED.negative_marks,
        final_score = EXCLUDED.final_score,
        percentage = EXCLUDED.percentage,
        is_passed = EXCLUDED.is_passed,
        time_taken_seconds = EXCLUDED.time_taken_seconds,
        status = EXCLUDED.status,
        updated_at = NOW()
    RETURNING * INTO v_result;

    -- Recalculate ranks for this quiz
    PERFORM public.recalculate_quiz_ranks(v_attempt.quiz_id);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to Recalculate Leaderboard Ranks for a Quiz
CREATE OR REPLACE FUNCTION public.recalculate_quiz_ranks(p_quiz_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ranked_results AS (
        SELECT id, DENSE_RANK() OVER (
            ORDER BY final_score DESC, time_taken_seconds ASC, created_at ASC
        ) as new_rank
        FROM public.results
        WHERE quiz_id = p_quiz_id
    )
    UPDATE public.results r
    SET rank = rr.new_rank
    FROM ranked_results rr
    WHERE r.id = rr.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to Auto-Select Top N Participants for Round Progression
CREATE OR REPLACE FUNCTION public.auto_select_top_participants(
    p_quiz_id UUID,
    p_top_n INT,
    p_admin_id UUID
)
RETURNS TABLE (
    participant_id UUID,
    full_name VARCHAR,
    score NUMERIC,
    rank INT,
    selected BOOLEAN
) AS $$
DECLARE
    v_quiz public.quizzes%ROWTYPE;
BEGIN
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;

    -- Reset round selection for this event and round
    UPDATE public.participants p
    SET round_1_selected = FALSE
    FROM public.quiz_assignments qa
    WHERE qa.participant_id = p.id AND qa.quiz_id = p_quiz_id;

    -- Select top N based on rank
    UPDATE public.participants p
    SET round_1_selected = TRUE
    FROM (
        SELECT r.participant_id
        FROM public.results r
        WHERE r.quiz_id = p_quiz_id
        ORDER BY r.final_score DESC, r.time_taken_seconds ASC
        LIMIT p_top_n
    ) top_p
    WHERE p.id = top_p.participant_id;

    -- Insert into round_selections
    INSERT INTO public.round_selections (event_id, round_number, participant_id, score, rank, selected, selected_by, published_at)
    SELECT 
        v_quiz.event_id,
        v_quiz.round_number,
        r.participant_id,
        r.final_score,
        r.rank,
        (r.rank <= p_top_n),
        p_admin_id,
        NOW()
    FROM public.results r
    WHERE r.quiz_id = p_quiz_id
    ON CONFLICT (event_id, round_number, participant_id) DO UPDATE SET
        score = EXCLUDED.score,
        rank = EXCLUDED.rank,
        selected = EXCLUDED.selected,
        selected_by = EXCLUDED.selected_by,
        published_at = EXCLUDED.published_at;

    RETURN QUERY
    SELECT p.id, p.full_name, r.final_score, r.rank, p.round_1_selected
    FROM public.participants p
    JOIN public.results r ON r.participant_id = p.id AND r.quiz_id = p_quiz_id
    ORDER BY r.rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
