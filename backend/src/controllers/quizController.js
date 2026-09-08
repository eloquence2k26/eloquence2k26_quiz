const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class QuizController {
  /**
   * Get all quizzes (Admin sees all, Participant sees assigned and published)
   */
  static async getAllQuizzes(req, res) {
    try {
      const user = req.user;
      let quizzes = db.get('quizzes');

      if (user.role === 'PARTICIPANT') {
        const assignments = db.filter('quiz_assignments', (a) => a.participant_id === user.id);
        const assignedQuizIds = new Set(assignments.map((a) => a.quiz_id));

        quizzes = quizzes.filter((q) => {
          const isAssigned = assignedQuizIds.has(q.id);
          const isVisibleStatus = ['Published', 'Live', 'Completed', 'Scheduled'].includes(q.status);
          return isAssigned && isVisibleStatus;
        });

        // Attach participant's attempt status to each quiz card
        const participantAttempts = db.filter('exam_attempts', (a) => a.participant_id === user.id);
        const participantResults = db.filter('results', (r) => r.participant_id === user.id);

        const enriched = quizzes.map((q) => {
          const attempt = participantAttempts.find((a) => a.quiz_id === q.id);
          const result = participantResults.find((r) => r.quiz_id === q.id);

          return {
            ...q,
            attempt_status: attempt ? attempt.status : 'NOT_STARTED',
            attempt_id: attempt ? attempt.id : null,
            result_summary: result
              ? {
                  score: result.final_score,
                  percentage: result.percentage,
                  rank: result.rank,
                  is_passed: result.is_passed
                }
              : null
          };
        });

        return success(res, enriched);
      }

      // For admin: enrich with question count & assigned count
      const enrichedAdmin = quizzes.map((q) => {
        const qCount = db.filter('quiz_questions', (qq) => qq.quiz_id === q.id).length;
        const assignedCount = db.filter('quiz_assignments', (qa) => qa.quiz_id === q.id).length;
        const attemptsCount = db.filter('exam_attempts', (ea) => ea.quiz_id === q.id).length;
        return {
          ...q,
          total_questions: qCount || q.total_questions || 0,
          assigned_participants_count: assignedCount,
          total_attempts_count: attemptsCount
        };
      });

      return success(res, enrichedAdmin);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get single quiz details
   */
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;
      const quiz = db.find('quizzes', (q) => q.id === id);
      if (!quiz) return error(res, 'Quiz not found', 404);

      const quizQuestions = db.filter('quiz_questions', (qq) => qq.quiz_id === id);
      const questionIds = quizQuestions.map((qq) => qq.question_id);

      let questions = [];
      if (req.user.role === 'ADMIN') {
        questions = db.filter('questions', (q) => questionIds.includes(q.id));
      }

      const assignedParticipants = db.filter('quiz_assignments', (qa) => qa.quiz_id === id);

      return success(res, {
        ...quiz,
        total_questions: quizQuestions.length,
        questions: req.user.role === 'ADMIN' ? questions : undefined,
        assigned_participants_count: assignedParticipants.length
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create a new quiz
   */
  static async createQuiz(req, res) {
    try {
      const {
        title,
        description,
        event_name = 'Eloquence 2026',
        round_number = 1,
        duration_minutes = 30,
        start_date,
        start_time = '09:00:00',
        end_date,
        end_time = '23:59:59',
        max_marks = 100,
        pass_percentage = 40,
        negative_marking = false,
        negative_mark_value = 0,
        max_attempts = 1,
        status = 'Draft',
        desktop_only = false,
        fullscreen_required = true,
        max_violations = 3,
        shuffle_questions = true,
        shuffle_options = true,
        question_ids = []
      } = req.body;

      if (!title || !start_date || !end_date) {
        return error(res, 'Title, start date, and end date are required', 400);
      }

      const numRound = Number(round_number) || 1;
      let roundRecord = db.find('rounds', (r) => r.round_number === numRound);
      if (!roundRecord) {
        roundRecord = db.insert('rounds', {
          event_id: 'c0000000-0000-0000-0000-000000000001',
          round_number: numRound,
          round_name: `Round ${numRound}`,
          description: `Symposium Examination Round ${numRound}`,
          is_active: true,
          is_published: ['Published', 'Live'].includes(status)
        });
      }

      const newQuiz = db.insert('quizzes', {
        title,
        description,
        event_name,
        round_id: roundRecord.id,
        round_number: numRound,
        total_questions: question_ids.length,
        duration_minutes: Number(duration_minutes),
        start_date,
        start_time,
        end_date,
        end_time,
        max_marks: Number(max_marks),
        pass_percentage: Number(pass_percentage),
        negative_marking: Boolean(negative_marking),
        negative_mark_value: Number(negative_mark_value),
        max_attempts: Number(max_attempts),
        status,
        desktop_only: Boolean(desktop_only),
        fullscreen_required: Boolean(fullscreen_required),
        max_violations: Number(max_violations),
        shuffle_questions: Boolean(shuffle_questions),
        shuffle_options: Boolean(shuffle_options),
        created_by: req.user.id
      });

      // Link questions if provided
      if (Array.isArray(question_ids) && question_ids.length > 0) {
        question_ids.forEach((qId, index) => {
          db.insert('quiz_questions', {
            quiz_id: newQuiz.id,
            question_id: qId,
            display_order: index + 1
          });
        });
      }

      AuditService.log(req.user.id, 'CREATE_QUIZ', 'QUIZ', newQuiz.id, { title: newQuiz.title });

      return success(res, newQuiz, 'Quiz created successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update quiz
   */
  static async updateQuiz(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = db.find('quizzes', (q) => q.id === id);
      if (!existing) return error(res, 'Quiz not found', 404);

      if (updates.question_ids && Array.isArray(updates.question_ids)) {
        // Replace existing question associations
        db.remove('quiz_questions', (qq) => qq.quiz_id === id);
        updates.question_ids.forEach((qId, index) => {
          db.insert('quiz_questions', {
            quiz_id: id,
            question_id: qId,
            display_order: index + 1
          });
        });
        updates.total_questions = updates.question_ids.length;
        delete updates.question_ids;
      }

      if (updates.round_number !== undefined) {
        const numRound = Number(updates.round_number) || 1;
        updates.round_number = numRound;
        let roundRecord = db.find('rounds', (r) => r.round_number === numRound);
        if (!roundRecord) {
          roundRecord = db.insert('rounds', {
            event_id: 'c0000000-0000-0000-0000-000000000001',
            round_number: numRound,
            round_name: `Round ${numRound}`,
            description: `Symposium Examination Round ${numRound}`,
            is_active: true,
            is_published: false
          });
        }
        updates.round_id = roundRecord.id;
      }

      const updated = db.update('quizzes', (q) => q.id === id, updates);

      AuditService.log(req.user.id, 'UPDATE_QUIZ', 'QUIZ', id, { updates });

      return success(res, updated, 'Quiz updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete quiz
   */
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;
      const existing = db.find('quizzes', (q) => q.id === id);
      if (!existing) return error(res, 'Quiz not found', 404);

      db.remove('quizzes', (q) => q.id === id);
      db.remove('quiz_questions', (qq) => qq.quiz_id === id);
      db.remove('quiz_assignments', (qa) => qa.quiz_id === id);

      AuditService.log(req.user.id, 'DELETE_QUIZ', 'QUIZ', id, { title: existing.title });

      return success(res, {}, 'Quiz deleted successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Change quiz status (Publish, Unpublish, Start Live, Stop/Close)
   */
  static async updateQuizStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['Draft', 'Scheduled', 'Published', 'Live', 'Completed', 'Closed'];
      if (!validStatuses.includes(status)) {
        return error(res, 'Invalid quiz status value', 400);
      }

      const updated = db.update('quizzes', (q) => q.id === id, { status });
      if (!updated) return error(res, 'Quiz not found', 404);

      AuditService.log(req.user.id, 'CHANGE_QUIZ_STATUS', 'QUIZ', id, { new_status: status });

      return success(res, updated, `Quiz status changed to ${status}`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = QuizController;
