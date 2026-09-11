const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const TimerService = require('../services/timerService');
const SessionService = require('../services/sessionService');
const ScoringService = require('../services/scoringService');
const AuditService = require('../services/auditService');
const ScheduleService = require('../services/scheduleService');
const SocketService = require('../services/socketService');

// Helper to shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class ExamController {
  /**
   * Start or Resume an Exam Attempt
   */
  static async startExam(req, res) {
    try {
      const { quizId } = req.params;
      const participantId = req.user.id;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz not found', 404);

      // Auto-handle scheduled status if time has arrived
      const entryStatus = ScheduleService.getEntryWindowStatus(quiz);
      if (quiz.status === 'Scheduled' && !entryStatus.isBeforeStart) {
        quiz.status = 'Live';
      }

      if (quiz.status !== 'Live' && quiz.status !== 'Published') {
        return error(res, `Quiz is currently ${quiz.status}. It is not open for attempts.`, 400);
      }

      // Resolve participant record across all potential identifier variants
      const participant = db.find(
        'participants',
        (p) =>
          p.id === participantId ||
          p.participant_id === participantId ||
          (p.email && p.email.toLowerCase() === (req.user.email || '').toLowerCase())
      );

      const possibleUserIds = new Set([
        participantId,
        req.user.id,
        req.user.email ? req.user.email.toLowerCase() : null,
        participant ? participant.id : null,
        participant ? participant.participant_id : null,
        participant ? participant.registration_number : null
      ].filter(Boolean));

      // Check Round 2 qualification if quiz is Round 2
      if (Number(quiz.round_number) === 2) {
        if (!participant || !participant.round_1_selected) {
          return error(res, 'Access denied. You have not qualified for Round 2.', 403);
        }
      }

      // Check assignment
      const allAssignments = db.get('quiz_assignments') || [];
      const assignment = allAssignments.find(
        (qa) => qa.quiz_id === quizId && (possibleUserIds.has(qa.participant_id) || (qa.participant_id && possibleUserIds.has(qa.participant_id.toLowerCase())))
      );
      const isEventMatched = participant?.event && (
        quiz.event_name?.trim().toLowerCase() === participant.event.trim().toLowerCase() ||
        quiz.title?.trim().toLowerCase() === participant.event.trim().toLowerCase()
      );

      if (!assignment && !isEventMatched && req.user.role === 'PARTICIPANT') {
        return error(res, 'You are not registered or assigned to this examination.', 400);
      }

      // Check existing attempts
      const existingAttempts = db.filter(
        'exam_attempts',
        (a) => a.quiz_id === quizId && possibleUserIds.has(a.participant_id)
      );

      const activeAttempt = existingAttempts.find((a) => a.status === 'IN_PROGRESS');

      if (activeAttempt) {
        // Check if server timer expired
        if (TimerService.isExpired(activeAttempt.expires_at)) {
          activeAttempt.status = 'COMPLETED';
          activeAttempt.submitted_at = activeAttempt.expires_at;
          db.update('exam_attempts', (a) => a.id === activeAttempt.id, activeAttempt);
          const result = ScoringService.calculateAttemptResult(activeAttempt.id);
          return error(res, 'Exam time has expired and your attempt was automatically submitted.', 400, { result });
        }

        // Generate or resume active session
        const sessionId = SessionService.startSession(participantId, quizId, ipAddress, userAgent);
        db.update('exam_attempts', (a) => a.id === activeAttempt.id, { session_id: sessionId });

        // Retrieve prepared questions in order
        const attemptData = await ExamController.buildAttemptPayload(activeAttempt, quiz);
        return success(res, { ...attemptData, sessionId }, 'Resumed active examination');
      }

      // If max attempts reached
      const completedAttempts = existingAttempts.filter(
        (a) => ['COMPLETED', 'TERMINATED', 'DISQUALIFIED'].includes(a.status)
      );
      if (completedAttempts.length >= (quiz.max_attempts || 1)) {
        return error(res, 'You have already utilized all allowed attempts for this examination.', 400);
      }

      // Timing checks for scheduled exam
      if (req.user.role === 'PARTICIPANT' && quiz.start_date && quiz.start_time) {
        if (entryStatus.isBeforeStart) {
          return error(
            res,
            `This examination has not started yet. Scheduled to begin at ${quiz.start_time}.`,
            400
          );
        }

        if (entryStatus.isAfterEnd) {
          return error(
            res,
            `This examination has concluded. The scheduled window has passed.`,
            400
          );
        }
      }

      // Create new Attempt
      const duration = Number(quiz.duration_minutes) || 30;
      const timer = TimerService.createTimer(duration);
      const sessionId = SessionService.startSession(participantId, quizId, ipAddress, userAgent);

      const attempt = db.insert('exam_attempts', {
        quiz_id: quizId,
        participant_id: participantId,
        attempt_number: completedAttempts.length + 1,
        session_id: sessionId,
        status: 'IN_PROGRESS',
        started_at: timer.started_at,
        expires_at: timer.expires_at,
        violation_count: 0,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      // Prepare Randomized Question and Option Orders
      const quizQuestions = db.filter('quiz_questions', (qq) => qq.quiz_id === quizId);
      let questionList = quizQuestions.map((qq) => db.find('questions', (q) => q.id === qq.question_id)).filter(Boolean);

      if (questionList.length === 0) {
        questionList = db.filter('questions', (q) => {
          const matchesRound = Number(q.round_number) === Number(quiz.round_number);
          const matchesEvent = !q.event_name || q.event_name === quiz.event_name || q.event_name === quiz.title;
          return matchesRound && matchesEvent;
        });
        if (questionList.length === 0) {
          questionList = db.filter('questions', (q) => Number(q.round_number) === Number(quiz.round_number));
        }
      }

      if (quiz.shuffle_questions) {
        questionList = shuffleArray(questionList);
      }

      questionList.forEach((q, idx) => {
        let optionsOrder = ['A', 'B', 'C', 'D'];
        if (quiz.shuffle_options) {
          optionsOrder = shuffleArray(optionsOrder);
        }

        db.insert('question_orders', {
          attempt_id: attempt.id,
          question_id: q.id,
          question_order: idx + 1,
          options_order: optionsOrder
        });
      });

      const attemptData = await ExamController.buildAttemptPayload(attempt, quiz);
      return success(res, { ...attemptData, sessionId }, 'Secure exam arena started successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Builds sanitized question payload for participant arena (Never sends correct answer or explanations)
   */
  static async buildAttemptPayload(attempt, quiz) {
    const questionOrders = db.filter('question_orders', (qo) => qo.attempt_id === attempt.id);
    questionOrders.sort((a, b) => a.question_order - b.question_order);

    const savedAnswers = db.filter('attempt_answers', (aa) => aa.attempt_id === attempt.id);

    const questions = questionOrders.map((qo) => {
      const q = db.find('questions', (item) => item.id === qo.question_id);
      if (!q) return null;

      const userAns = savedAnswers.find((ans) => ans.question_id === q.id);

      // Map options based on options_order
      const rawOptions = {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d
      };

      const options = qo.options_order.map((key) => ({
        key,
        text: rawOptions[key]
      }));

      return {
        id: q.id,
        order: qo.question_order,
        question_text: q.question_text,
        options,
        marks: q.marks,
        negative_marks: quiz.negative_marking ? (quiz.negative_mark_value || q.negative_marks) : 0,
        category: q.category,
        difficulty: q.difficulty,
        selected_option: userAns ? userAns.selected_option : null,
        is_marked_for_review: userAns ? Boolean(userAns.is_marked_for_review) : false
      };
    }).filter(Boolean);

    const remainingSeconds = TimerService.getRemainingSeconds(attempt.expires_at);

    return {
      attempt_id: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        event_name: quiz.event_name,
        round_number: quiz.round_number,
        duration_minutes: quiz.duration_minutes,
        max_violations: quiz.max_violations !== undefined ? quiz.max_violations : 1,
        fullscreen_required: quiz.fullscreen_required !== false,
        negative_marking: quiz.negative_marking,
        negative_mark_value: quiz.negative_mark_value,
        total_questions: questions.length
      },
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      remaining_seconds: remainingSeconds,
      violation_count: attempt.violation_count || 0,
      questions
    };
  }

  /**
   * Save / Autosave Single or Batch Question Answers
   */
  static async saveAnswer(req, res) {
    try {
      const { attemptId } = req.params;
      const { question_id, selected_option, is_marked_for_review } = req.body;

      if (!question_id) return error(res, 'Question ID is required', 400);

      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Exam attempt not found', 404);

      if (attempt.status !== 'IN_PROGRESS') {
        return error(res, `Cannot save answer. Attempt is already ${attempt.status}.`, 400);
      }

      // Check expiration
      if (TimerService.isExpired(attempt.expires_at)) {
        attempt.status = 'COMPLETED';
        attempt.submitted_at = attempt.expires_at;
        db.update('exam_attempts', (a) => a.id === attemptId, attempt);
        ScoringService.calculateAttemptResult(attemptId);
        return error(res, 'Exam time has expired. Auto-submitting attempt.', 400);
      }

      const existingAnswer = db.find(
        'attempt_answers',
        (a) => a.attempt_id === attemptId && a.question_id === question_id
      );

      const answerPayload = {
        attempt_id: attemptId,
        question_id,
        selected_option: selected_option !== undefined ? selected_option : (existingAnswer ? existingAnswer.selected_option : null),
        is_marked_for_review: is_marked_for_review !== undefined ? Boolean(is_marked_for_review) : (existingAnswer ? existingAnswer.is_marked_for_review : false),
        answered_at: new Date().toISOString()
      };

      if (existingAnswer) {
        db.update('attempt_answers', (a) => a.id === existingAnswer.id, answerPayload);
      } else {
        db.insert('attempt_answers', answerPayload);
      }

      return success(res, { question_id, saved: true, timestamp: new Date().toISOString() }, 'Answer autosaved');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Record a Security Violation & Check Auto-Termination Threshold
   */
  static async recordSecurityEvent(req, res) {
    try {
      const { attemptId } = req.params;
      const { violation_type, description, metadata = {} } = req.body;
      const ipAddress = req.ip || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Attempt not found', 404);

      if (attempt.status !== 'IN_PROGRESS') {
        return success(res, { status: attempt.status }, 'Attempt already finished');
      }

      const quiz = db.find('quizzes', (q) => q.id === attempt.quiz_id);
      const maxAllowedViolations = (quiz && quiz.max_violations !== undefined) ? Number(quiz.max_violations) : 1;

      // Classify severity - Major AI cheating & DevTools are strictly CRITICAL
      const isCritical = [
        'GEMINI_ASSISTANT_TRIGGER',
        'MOBILE_LONG_PRESS',
        'CIRCLE_TO_SEARCH',
        'SPLIT_SCREEN',
        'SCREEN_CAPTURE',
        'DEVTOOLS_INSPECTION',
        'DEBUGGER_TRAP',
        'AI_EXTENSION_DETECTED',
        'AUTOMATION_DETECTED',
        'MULTIPLE_DISPLAYS',
        'MOUSE_LEAVE_WINDOW',
        'ANOMALOUS_SPEED_BOT_OR_AI',
        'TAB_SWITCH',
        'FULLSCREEN_EXIT',
        'WINDOW_BLUR',
        'MULTIPLE_SESSION'
      ].includes(violation_type);

      // Instant zero-tolerance disqualification events (Terminates on 1st detection)
      const isZeroToleranceInstantKill = [
        'GEMINI_ASSISTANT_TRIGGER',
        'MOBILE_LONG_PRESS',
        'CIRCLE_TO_SEARCH',
        'SPLIT_SCREEN',
        'MULTI_TOUCH_GESTURE',
        'SCREEN_CAPTURE',
        'DEVTOOLS_INSPECTION',
        'DEBUGGER_TRAP',
        'AI_EXTENSION_DETECTED',
        'AUTOMATION_DETECTED',
        'MULTIPLE_SESSION',
        'TAB_SWITCH',
        'FULLSCREEN_EXIT',
        'WINDOW_BLUR'
      ].includes(violation_type) || Boolean(metadata?.instant_kill) || Boolean(metadata?.strict_single_strike);

      // Log violation
      const violation = db.insert('security_violations', {
        attempt_id: attemptId,
        participant_id: attempt.participant_id,
        quiz_id: attempt.quiz_id,
        violation_type: violation_type || 'SUSPICIOUS_ACTIVITY',
        description: description || 'Proctoring security anomaly detected',
        severity: isCritical ? 'HIGH' : 'MEDIUM',
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      });

      const newViolationCount = (attempt.violation_count || 0) + 1;
      db.update('exam_attempts', (a) => a.id === attemptId, { violation_count: newViolationCount });

      // Check if limit reached, strict single-strike active, or zero-tolerance instant kill -> Auto Terminate Immediately
      if (
        newViolationCount >= maxAllowedViolations ||
        metadata.strict_single_strike ||
        isZeroToleranceInstantKill
      ) {
        const termReason = description || `Disqualified automatically due to security violation (${violation_type})`;
        db.update('exam_attempts', (a) => a.id === attemptId, {
          status: 'TERMINATED',
          termination_reason: termReason,
          submitted_at: new Date().toISOString()
        });

        // Calculate score for partial submission (disqualified)
        const finalResult = ScoringService.calculateAttemptResult(attemptId);
        SessionService.endSession(attempt.participant_id, attempt.quiz_id);

        AuditService.log(null, 'AUTO_TERMINATE_EXAM', 'EXAM_ATTEMPT', attemptId, {
          participant_id: attempt.participant_id,
          reason: termReason,
          violations: newViolationCount,
          violation_type,
          instant_kill: isZeroToleranceInstantKill
        });

        return success(res, {
          terminated: true,
          status: 'TERMINATED',
          reason: termReason,
          violation_count: newViolationCount,
          max_violations: maxAllowedViolations,
          result: finalResult
        }, 'Security violation detected. Exam terminated immediately.');
      }

      return success(res, {
        terminated: false,
        warning_number: newViolationCount,
        max_violations: maxAllowedViolations,
        remaining_warnings: Math.max(0, maxAllowedViolations - newViolationCount)
      }, `Security warning ${newViolationCount} of ${maxAllowedViolations}`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Submit Examination
   */
  static async submitExam(req, res) {
    try {
      const { attemptId } = req.params;
      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Attempt not found', 404);

      if (attempt.status === 'COMPLETED') {
        const result = db.find('results', (r) => r.attempt_id === attemptId);
        return success(res, result, 'Exam already submitted');
      }

      // Update attempt status
      db.update('exam_attempts', (a) => a.id === attemptId, {
        status: 'COMPLETED',
        submitted_at: new Date().toISOString()
      });

      // Calculate score and result
      const result = ScoringService.calculateAttemptResult(attemptId);
      SessionService.endSession(attempt.participant_id, attempt.quiz_id);

      return success(res, result, 'Examination successfully submitted and graded');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Live Exam Monitor (Admin Real-Time Dashboard)
   */
  static async getLiveMonitoring(req, res) {
    try {
      const { quizId } = req.params;
      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz not found', 404);

      const attempts = db.filter('exam_attempts', (a) => a.quiz_id === quizId);
      const participants = db.get('participants');
      const answers = db.get('attempt_answers');
      const violations = db.get('security_violations');

      const liveRows = attempts.map((a) => {
        const p = participants.find((part) => part.id === a.participant_id);
        const pAnswers = answers.filter((ans) => ans.attempt_id === a.id && ans.selected_option);
        const pViolations = violations.filter((v) => v.attempt_id === a.id);
        const remainingSeconds = a.status === 'IN_PROGRESS' ? TimerService.getRemainingSeconds(a.expires_at) : 0;

        return {
          attempt_id: a.id,
          participant_id: a.participant_id,
          participant_name: p ? p.full_name : 'Unknown',
          college: p ? p.college : 'N/A',
          status: a.status,
          started_at: a.started_at,
          expires_at: a.expires_at,
          remaining_seconds: remainingSeconds,
          answered_count: pAnswers.length,
          total_questions: quiz.total_questions,
          violation_count: pViolations.length,
          latest_violation: pViolations.length > 0 ? pViolations[pViolations.length - 1] : null,
          last_activity: a.updated_at || a.started_at
        };
      });

      return success(res, {
        quiz: { id: quiz.id, title: quiz.title, status: quiz.status },
        total_participants: attempts.length,
        active_count: attempts.filter((a) => a.status === 'IN_PROGRESS').length,
        completed_count: attempts.filter((a) => a.status === 'COMPLETED').length,
        terminated_count: attempts.filter((a) => a.status === 'TERMINATED' || a.status === 'DISQUALIFIED').length,
        live_participants: liveRows
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Admin Force Terminate Participant Attempt
   */
  static async adminTerminateAttempt(req, res) {
    try {
      const { attemptId } = req.params;
      const { reason = 'Disqualified by Symposium Admin' } = req.body;

      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Attempt not found', 404);

      db.update('exam_attempts', (a) => a.id === attemptId, {
        status: 'DISQUALIFIED',
        termination_reason: reason,
        submitted_at: new Date().toISOString()
      });

      const result = ScoringService.calculateAttemptResult(attemptId);
      SessionService.endSession(attempt.participant_id, attempt.quiz_id);

      AuditService.log(req.user.id, 'ADMIN_TERMINATE_ATTEMPT', 'EXAM_ATTEMPT', attemptId, { reason });

      return success(res, result, 'Attempt terminated and disqualified by admin');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Admin Extend Exam Time for Participant
   */
  static async adminExtendTime(req, res) {
    try {
      const { attemptId } = req.params;
      const { extra_minutes = 5 } = req.body;

      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Attempt not found', 404);

      if (attempt.status !== 'IN_PROGRESS') {
        return error(res, 'Can only extend time for currently in-progress attempts', 400);
      }

      const currentExpiry = new Date(attempt.expires_at).getTime();
      const newExpiry = new Date(currentExpiry + extra_minutes * 60 * 1000).toISOString();

      db.update('exam_attempts', (a) => a.id === attemptId, { expires_at: newExpiry });

      AuditService.log(req.user.id, 'ADMIN_EXTEND_TIME', 'EXAM_ATTEMPT', attemptId, { extra_minutes });

      return success(res, { new_expires_at: newExpiry }, `Added ${extra_minutes} minutes to exam attempt`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get all exam attempts across all quizzes with participant and event details
   */
  static async getAllAttemptsAdmin(req, res) {
    try {
      const { quiz_id, event_name, status, search } = req.query;
      const attempts = db.get('exam_attempts');
      const participants = db.get('participants');
      const quizzes = db.get('quizzes');
      const results = db.get('results');
      const violations = db.get('security_violations');

      const enriched = attempts.map((a) => {
        const p = participants.find((part) => part.id === a.participant_id);
        const q = quizzes.find((quiz) => quiz.id === a.quiz_id);
        const r = results.find((res) => res.attempt_id === a.id);
        const pViolations = violations.filter((v) => v.attempt_id === a.id);

        return {
          id: a.id,
          attempt_id: a.id,
          participant_id: a.participant_id,
          participant_name: p ? p.full_name : 'Unknown Scholar',
          participant_code: p ? p.participant_id : 'N/A',
          registration_number: p ? p.registration_number : '—',
          email: p ? p.email : '',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          event_name: (p && p.event) || (q && q.event_name) || (q && q.title) || 'Technical Quiz',
          quiz_id: a.quiz_id,
          quiz_title: q ? q.title : 'Examination',
          round_number: q ? q.round_number : 1,
          status: a.status,
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          termination_reason: a.termination_reason || null,
          violation_count: pViolations.length || a.violation_count || 0,
          score: r ? r.final_score : 0,
          percentage: r ? r.percentage : 0,
          is_passed: r ? r.is_passed : false,
          rank: r ? r.rank : null,
          updated_at: a.updated_at || a.started_at
        };
      });

      // Sort recent first
      enriched.sort((a, b) => new Date(b.updated_at || b.started_at) - new Date(a.updated_at || a.started_at));

      let filtered = enriched;
      if (quiz_id && quiz_id !== 'ALL') {
        filtered = filtered.filter((a) => a.quiz_id === quiz_id);
      }
      if (event_name && event_name !== 'ALL') {
        filtered = filtered.filter(
          (a) => (a.event_name || '').toLowerCase() === event_name.toLowerCase()
        );
      }
      if (status && status !== 'ALL') {
        if (status === 'TERMINATED') {
          filtered = filtered.filter((a) => a.status === 'TERMINATED' || a.status === 'DISQUALIFIED');
        } else {
          filtered = filtered.filter((a) => a.status === status);
        }
      }
      if (search) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(
          (a) =>
            a.participant_name.toLowerCase().includes(term) ||
            a.participant_code.toLowerCase().includes(term) ||
            a.registration_number.toLowerCase().includes(term) ||
            a.email.toLowerCase().includes(term) ||
            a.college.toLowerCase().includes(term) ||
            a.quiz_title.toLowerCase().includes(term)
        );
      }

      return success(res, filtered);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Admin Restart / Reset Participant's Terminated Exam Attempt
   * Deletes the terminated attempt, answers, results, and violation strikes
   * to grant the participant a clean re-attempt.
   */
  static async adminRestartAttempt(req, res) {
    try {
      const { attemptId } = req.params;
      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Exam attempt not found', 404);

      const participantId = attempt.participant_id;
      const quizId = attempt.quiz_id;

      // Resolve participant record to handle all alias IDs
      const participant = db.find(
        'participants',
        (p) =>
          p.id === participantId ||
          p.participant_id === participantId ||
          (p.email && p.email.toLowerCase() === (attempt.email || '').toLowerCase())
      );

      const possibleIds = new Set([
        participantId,
        participant ? participant.id : null,
        participant ? participant.participant_id : null,
        participant && participant.email ? participant.email.toLowerCase() : null
      ].filter(Boolean));

      // 1. Remove previous attempt answers & question ordering
      db.remove('attempt_answers', (aa) => aa.attempt_id === attemptId);
      db.remove('question_orders', (qo) => qo.attempt_id === attemptId);

      // 2. Remove previous result calculation
      db.remove('results', (r) => r.attempt_id === attemptId || (possibleIds.has(r.participant_id) && r.quiz_id === quizId));

      // 3. Remove previous exam session locks
      db.remove('exam_sessions', (es) => possibleIds.has(es.participant_id) && es.quiz_id === quizId);

      // 4. Remove previous security violations for this attempt
      db.remove('security_violations', (sv) => sv.attempt_id === attemptId || possibleIds.has(sv.participant_id));

      // 5. Delete the terminated exam attempt record so participant can take it anew
      db.remove('exam_attempts', (a) => a.id === attemptId || (possibleIds.has(a.participant_id) && a.quiz_id === quizId));

      // 6. Ensure participant and user accounts are active (un-disabled if flagged)
      db.update('participants', (p) => possibleIds.has(p.id) || possibleIds.has(p.participant_id), { is_disabled: false });
      if (participant?.id) {
        db.update('users', (u) => u.id === participant.id || u.id === participantId, { is_active: true });
      }

      AuditService.log(req.user.id, 'ADMIN_RESTART_EXAM_ATTEMPT', 'EXAM_ATTEMPT', attemptId, {
        participant_id: participantId,
        quiz_id: quizId,
        previous_status: attempt.status,
        previous_termination_reason: attempt.termination_reason
      });

      // Real-time WebSocket notify to participant dashboard
      SocketService.notifyExamRestart(participantId, quizId);

      return success(
        res,
        { participant_id: participantId, quiz_id: quizId },
        'Exam attempt successfully reset. Participant can now re-attempt the test.'
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = ExamController;
