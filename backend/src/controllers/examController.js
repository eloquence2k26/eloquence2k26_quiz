const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const TimerService = require('../services/timerService');
const SessionService = require('../services/sessionService');
const ScoringService = require('../services/scoringService');
const AuditService = require('../services/auditService');

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

      if (quiz.status !== 'Live' && quiz.status !== 'Published') {
        return error(res, `Quiz is currently ${quiz.status}. It is not open for attempts.`, 403);
      }

      // Check Round 2 qualification if quiz is Round 2
      if (quiz.round_number === 2) {
        const participant = db.find('participants', (p) => p.id === participantId);
        if (!participant || !participant.round_1_selected) {
          return error(res, 'Access denied. You have not qualified for Round 2.', 403);
        }
      }

      // Check assignment
      const assignment = db.find(
        'quiz_assignments',
        (qa) => qa.quiz_id === quizId && qa.participant_id === participantId
      );
      if (!assignment && req.user.role === 'PARTICIPANT') {
        return error(res, 'You are not registered or assigned to this examination.', 403);
      }

      // Check existing attempts
      const existingAttempts = db.filter(
        'exam_attempts',
        (a) => a.quiz_id === quizId && a.participant_id === participantId
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
        return error(res, 'You have already utilized all allowed attempts for this examination.', 403);
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

      // Classify severity
      const isCritical = [
        'GEMINI_ASSISTANT_TRIGGER',
        'MOBILE_LONG_PRESS',
        'CIRCLE_TO_SEARCH',
        'SPLIT_SCREEN',
        'SCREEN_CAPTURE',
        'DEVTOOLS_INSPECTION',
        'TAB_SWITCH',
        'FULLSCREEN_EXIT',
        'WINDOW_BLUR',
        'MULTIPLE_SESSION'
      ].includes(violation_type);

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

      // Check if limit reached or strict single-strike active -> Auto Terminate Immediately
      if (newViolationCount >= maxAllowedViolations || metadata.strict_single_strike) {
        const termReason = description || `Terminated automatically due to security violation (${violation_type})`;
        db.update('exam_attempts', (a) => a.id === attemptId, {
          status: 'TERMINATED',
          termination_reason: termReason,
          submitted_at: new Date().toISOString()
        });

        // Calculate score for partial submission
        const finalResult = ScoringService.calculateAttemptResult(attemptId);
        SessionService.endSession(attempt.participant_id, attempt.quiz_id);

        AuditService.log(null, 'AUTO_TERMINATE_EXAM', 'EXAM_ATTEMPT', attemptId, {
          participant_id: attempt.participant_id,
          reason: termReason,
          violations: newViolationCount,
          violation_type
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
}

module.exports = ExamController;
