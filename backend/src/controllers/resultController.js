const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const TimerService = require('../services/timerService');
const AuditService = require('../services/auditService');

class ResultController {
  /**
   * Get Comprehensive Event Overview:
   * - Schedule info (if Scheduled / Draft)
   * - Real-time student timers & live status (if Started / Live)
   * - Graded scorecards, marks breakdown & publish status (if Finished / Submitted)
   */
  static async getEventOverview(req, res) {
    try {
      const { quizId } = req.params;
      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz / Event not found', 404);

      const participants = db.get('participants');
      const assignments = db.filter('quiz_assignments', (qa) => qa.quiz_id === quizId);
      const attempts = db.filter('exam_attempts', (ea) => ea.quiz_id === quizId);
      const results = db.filter('results', (r) => r.quiz_id === quizId);
      const answers = db.get('attempt_answers');
      const violations = db.get('security_violations');

      const isGloballyPublished = Boolean(quiz.is_results_published);
      const publishedParticipantIds = Array.isArray(quiz.published_participant_ids)
        ? quiz.published_participant_ids
        : [];

      // 1. Scheduled Data (All assigned participants)
      const assignedList = assignments.map((qa) => {
        const p = participants.find((part) => part.id === qa.participant_id);
        const pAttempt = attempts.find((a) => a.participant_id === qa.participant_id);
        return {
          participant_id: p ? p.participant_id : 'N/A',
          id: p ? p.id : qa.participant_id,
          full_name: p ? p.full_name : 'Unknown',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          registration_number: p ? p.registration_number : '—',
          status: pAttempt ? pAttempt.status : 'ASSIGNED_NOT_STARTED'
        };
      });

      // 2. Started / Live Data (Students currently taking the test)
      const liveList = attempts
        .filter((a) => a.status === 'IN_PROGRESS')
        .map((a) => {
          const p = participants.find((part) => part.id === a.participant_id);
          const pAnswers = answers.filter((ans) => ans.attempt_id === a.id && ans.selected_option);
          const pViolations = violations.filter((v) => v.attempt_id === a.id);
          const remainingSeconds = TimerService.getRemainingSeconds(a.expires_at);

          const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
          const secs = Math.max(0, remainingSeconds) % 60;

          return {
            attempt_id: a.id,
            participant_id: p ? p.participant_id : 'N/A',
            id: a.participant_id,
            full_name: p ? p.full_name : 'Unknown',
            college: p ? p.college : 'N/A',
            registration_number: p ? p.registration_number : '—',
            started_at: a.started_at,
            expires_at: a.expires_at,
            remaining_seconds: remainingSeconds,
            remaining_formatted: `${mins}m ${String(secs).padStart(2, '0')}s`,
            answered_count: pAnswers.length,
            total_questions: quiz.total_questions || 0,
            violation_count: pViolations.length,
            status: a.status
          };
        });

      // 3. Finished / Submitted Results Data (Graded marks)
      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      const finishedList = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        const attempt = attempts.find((a) => a.id === r.attempt_id);
        const pViolations = violations.filter((v) => v.attempt_id === r.attempt_id);

        const isPublishedToLogin = isGloballyPublished || publishedParticipantIds.includes(r.participant_id) || Boolean(r.is_published_to_login);

        const timeSecs = r.time_taken_seconds || 0;
        const timeMins = Math.floor(timeSecs / 60);
        const timeRemainingSecs = timeSecs % 60;

        return {
          result_id: r.id,
          attempt_id: r.attempt_id,
          id: r.participant_id,
          participant_id: p ? p.participant_id : 'N/A',
          full_name: p ? p.full_name : 'Unknown',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          registration_number: p ? p.registration_number : '—',
          rank: r.rank || 1,
          final_score: r.final_score,
          percentage: r.percentage,
          is_passed: r.is_passed,
          correct_answers: r.correct_answers,
          wrong_answers: r.wrong_answers,
          unanswered_questions: r.unanswered_questions,
          total_questions: r.total_questions || quiz.total_questions,
          time_taken_seconds: timeSecs,
          time_taken_formatted: `${timeMins}m ${String(timeRemainingSecs).padStart(2, '0')}s`,
          status: r.status || (attempt ? attempt.status : 'COMPLETED'),
          submitted_at: attempt ? attempt.submitted_at : r.created_at,
          violations_count: pViolations.length,
          round_1_selected: p ? Boolean(p.round_1_selected) : false,
          is_published_to_login: isPublishedToLogin
        };
      });

      // Determine active lifecycle stage
      let lifecycleStage = 'FINISHED';
      if (quiz.status === 'Draft' || quiz.status === 'Scheduled') {
        lifecycleStage = 'SCHEDULED';
      } else if (quiz.status === 'Live' || liveList.length > 0) {
        lifecycleStage = 'STARTED';
      }

      return success(res, {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          event_name: quiz.event_name,
          round_number: quiz.round_number,
          status: quiz.status,
          start_date: quiz.start_date,
          start_time: quiz.start_time,
          end_date: quiz.end_date,
          end_time: quiz.end_time,
          duration_minutes: quiz.duration_minutes,
          max_marks: quiz.max_marks,
          pass_percentage: quiz.pass_percentage,
          total_questions: quiz.total_questions,
          is_results_published: isGloballyPublished,
          published_participant_ids: publishedParticipantIds
        },
        lifecycle_stage: lifecycleStage,
        stats: {
          total_assigned: assignedList.length,
          total_in_progress: liveList.length,
          total_completed: finishedList.length,
          total_published_logins: finishedList.filter((f) => f.is_published_to_login).length
        },
        scheduled_data: assignedList,
        started_data: liveList,
        finished_data: finishedList
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Option 1: Publish All Results Globally to Portal
   */
  static async publishAllResults(req, res) {
    try {
      const { quizId } = req.params;
      const { publish = true } = req.body;

      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz not found', 404);

      const allResults = db.filter('results', (r) => r.quiz_id === quizId);
      const participantIds = allResults.map((r) => r.participant_id);

      db.update('quizzes', (q) => q.id === quizId, {
        is_results_published: Boolean(publish),
        published_participant_ids: Boolean(publish) ? participantIds : []
      });

      // Update all individual results
      allResults.forEach((r) => {
        db.update('results', (item) => item.id === r.id, {
          is_published_to_login: Boolean(publish)
        });
      });

      AuditService.log(req.user.id, 'PUBLISH_ALL_RESULTS', 'QUIZ', quizId, {
        quiz_title: quiz.title,
        published: Boolean(publish),
        count: allResults.length
      });

      return success(res, {
        is_results_published: Boolean(publish),
        count: allResults.length
      }, Boolean(publish) ? 'All quiz results published to participant portals!' : 'Results unpublished from participant portals.');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Option 2: Select & Send Results to Particular Participant Logins
   */
  static async sendSelectiveResults(req, res) {
    try {
      const { quizId } = req.params;
      const { participant_ids = [], send_status = true } = req.body;

      if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
        return error(res, 'No participants selected to send results', 400);
      }

      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz not found', 404);

      let currentPublished = Array.isArray(quiz.published_participant_ids) ? [...quiz.published_participant_ids] : [];

      if (send_status) {
        participant_ids.forEach((pId) => {
          if (!currentPublished.includes(pId)) currentPublished.push(pId);
        });
      } else {
        currentPublished = currentPublished.filter((pId) => !participant_ids.includes(pId));
      }

      db.update('quizzes', (q) => q.id === quizId, {
        published_participant_ids: currentPublished
      });

      // Update matching result records
      participant_ids.forEach((pId) => {
        db.update('results', (r) => r.quiz_id === quizId && r.participant_id === pId, {
          is_published_to_login: Boolean(send_status)
        });
      });

      AuditService.log(req.user.id, 'SEND_SELECTIVE_RESULTS', 'QUIZ', quizId, {
        participant_count: participant_ids.length,
        send_status: Boolean(send_status)
      });

      return success(res, {
        published_count: currentPublished.length,
        selected_count: participant_ids.length
      }, `Successfully ${send_status ? 'sent results to' : 'revoked results from'} ${participant_ids.length} participant login(s).`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Leaderboard / All Results for a Quiz (Admin view or Participant summary)
   */
  static async getQuizResults(req, res) {
    try {
      const { quizId } = req.params;
      const { college, status, search } = req.query;

      const quiz = db.find('quizzes', (q) => q.id === quizId);
      if (!quiz) return error(res, 'Quiz not found', 404);

      let results = db.filter('results', (r) => r.quiz_id === quizId);
      const participants = db.get('participants');
      const violations = db.get('security_violations');

      const isGloballyPublished = Boolean(quiz.is_results_published);
      const publishedParticipantIds = Array.isArray(quiz.published_participant_ids)
        ? quiz.published_participant_ids
        : [];

      // If participant requesting
      if (req.user.role === 'PARTICIPANT') {
        const isEligible = isGloballyPublished || publishedParticipantIds.includes(req.user.id);
        const userResult = results.find((r) => r.participant_id === req.user.id);

        if (!userResult) return error(res, 'No completed result found for your attempt', 404);

        if (!isEligible && !userResult.is_published_to_login) {
          return error(res, 'Official examination results have not been released by the symposium desk yet. Please check back shortly.', 403);
        }

        const p = participants.find((part) => part.id === req.user.id);
        return success(res, {
          ...userResult,
          participant_name: p ? p.full_name : 'Participant',
          participant_id_str: p ? p.participant_id : 'N/A'
        });
      }

      // Sort by rank ascending
      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      const enriched = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        const pViolations = violations.filter((v) => v.attempt_id === r.attempt_id);
        const isPublishedToLogin = isGloballyPublished || publishedParticipantIds.includes(r.participant_id) || Boolean(r.is_published_to_login);

        return {
          ...r,
          participant_name: p ? p.full_name : 'Unknown',
          participant_id_str: p ? p.participant_id : 'N/A',
          registration_number: p ? p.registration_number : '—',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          round_1_selected: p ? Boolean(p.round_1_selected) : false,
          violations_count: pViolations.length,
          is_published_to_login: isPublishedToLogin
        };
      });

      let filtered = enriched;

      if (college) {
        filtered = filtered.filter((r) => r.college.toLowerCase().includes(college.toLowerCase()));
      }
      if (status) {
        filtered = filtered.filter((r) => r.status && r.status.toLowerCase() === status.toLowerCase());
      }
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter((r) =>
          r.participant_name.toLowerCase().includes(term) ||
          r.participant_id_str.toLowerCase().includes(term) ||
          r.college.toLowerCase().includes(term)
        );
      }

      return success(res, {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          round_number: quiz.round_number,
          max_marks: quiz.max_marks,
          pass_percentage: quiz.pass_percentage,
          is_results_published: isGloballyPublished
        },
        total_participants_attempted: enriched.length,
        results: filtered
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Single Participant Attempt Result Details
   */
  static async getAttemptResult(req, res) {
    try {
      const { attemptId } = req.params;
      const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
      if (!attempt) return error(res, 'Exam attempt not found', 404);

      const quiz = db.find('quizzes', (q) => q.id === attempt.quiz_id);
      const isGloballyPublished = quiz ? Boolean(quiz.is_results_published) : false;
      const publishedParticipantIds = (quiz && Array.isArray(quiz.published_participant_ids))
        ? quiz.published_participant_ids
        : [];

      if (req.user.role === 'PARTICIPANT') {
        if (attempt.participant_id !== req.user.id) {
          return error(res, 'Unauthorized to view this result', 403);
        }
        const isEligible = isGloballyPublished || publishedParticipantIds.includes(req.user.id);
        const resultCheck = db.find('results', (r) => r.attempt_id === attemptId);
        if (!isEligible && !(resultCheck && resultCheck.is_published_to_login)) {
          return error(res, 'Official examination results have not been released by the symposium desk yet.', 403);
        }
      }

      const result = db.find('results', (r) => r.attempt_id === attemptId);
      if (!result) return error(res, 'Result not generated yet for this attempt', 404);

      const participant = db.find('participants', (p) => p.id === attempt.participant_id);

      // If admin or detailed results enabled, include question-by-question breakdown
      let questionBreakdown = [];
      if (req.user.role === 'ADMIN' || (quiz && quiz.show_detailed_results)) {
        const answers = db.filter('attempt_answers', (aa) => aa.attempt_id === attemptId);
        const questions = db.get('questions');

        questionBreakdown = answers.map((ans, idx) => {
          const q = questions.find((item) => item.id === ans.question_id);
          return {
            index: idx + 1,
            question_text: q ? q.question_text : 'N/A',
            selected_option: ans.selected_option,
            correct_answer: q ? q.correct_answer : null,
            is_correct: ans.is_correct,
            marks_awarded: ans.marks_awarded,
            explanation: q ? q.explanation : ''
          };
        });
      }

      return success(res, {
        result,
        quiz: {
          id: quiz ? quiz.id : null,
          title: quiz ? quiz.title : 'MCQ Examination',
          round_number: quiz ? quiz.round_number : 1,
          max_marks: quiz ? quiz.max_marks : 100
        },
        participant: {
          id: participant ? participant.id : null,
          full_name: participant ? participant.full_name : 'Participant',
          participant_id: participant ? participant.participant_id : 'N/A',
          registration_number: participant ? participant.registration_number : '—',
          round_1_selected: participant ? participant.round_1_selected : false
        },
        breakdown: questionBreakdown
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = ResultController;
