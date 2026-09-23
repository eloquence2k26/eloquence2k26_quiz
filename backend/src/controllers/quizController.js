const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');
const ScheduleService = require('../services/scheduleService');
const SocketService = require('../services/socketService');

class QuizController {
  /**
   * Get all quizzes (Admin sees all, Participant sees assigned and published)
   */
  static async getAllQuizzes(req, res) {
    try {
      // Auto-publish any scheduled quizzes whose time has arrived
      ScheduleService.checkAndPublishScheduledQuizzes();

      const user = req.user;
      let quizzes = db.get('quizzes') || [];
      const events = db.get('events') || [];
      const rounds = db.get('rounds') || [];

      // Ensure every registered event has at least one active quiz record in quizzes table
      if (events.length > 0) {
        events.forEach((ev) => {
          const hasQuiz = quizzes.some(
            (q) => (q.event_id === ev.id || (q.event_name && q.event_name.toLowerCase() === ev.title.toLowerCase())) &&
                   Number(q.round_number) === 1
          );
          if (!hasQuiz) {
            const evRound = rounds.find(
              (r) => (r.event_id === ev.id || (r.event_name && r.event_name.toLowerCase() === ev.title.toLowerCase())) &&
                     Number(r.round_number) === 1
            );
            db.insert('quizzes', {
              event_id: ev.id,
              round_id: evRound ? evRound.id : null,
              title: `${ev.title} - Examination`,
              event_name: ev.title,
              event_code: ev.code || 'ELQ26',
              description: ev.description || `${ev.title} Examination`,
              round_number: 1,
              total_questions: 0,
              duration_minutes: 30,
              start_date: new Date().toISOString().split('T')[0],
              start_time: '09:00:00',
              end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
              end_time: '23:59:59',
              max_marks: 100,
              pass_percentage: 40,
              negative_marking: false,
              negative_mark_value: 0,
              max_attempts: 1,
              status: 'Draft',
              desktop_only: false,
              fullscreen_required: true,
              max_violations: 1,
              shuffle_questions: true,
              shuffle_options: true,
              show_detailed_results: true
            });
            // db.insert already pushed to this.data.quizzes
          }
        });
      }

      // Deduplicate quizzes: keep at most 1 quiz per (event_id, round_number)
      const seenKey = new Set();
      const deduplicated = [];
      for (const q of quizzes) {
        if (!q.id) continue;
        const key = `${q.event_id || q.event_name?.toLowerCase() || 'default'}-round-${q.round_number || 1}`;
        if (seenKey.has(key)) {
          const existingIdx = deduplicated.findIndex((x) => 
            `${x.event_id || x.event_name?.toLowerCase() || 'default'}-round-${x.round_number || 1}` === key
          );
          if (existingIdx !== -1 && ['Scheduled', 'Live', 'Published'].includes(q.status) && deduplicated[existingIdx].status === 'Draft') {
            deduplicated[existingIdx] = q;
          }
          continue;
        }
        seenKey.add(key);
        deduplicated.push(q);
      }
      quizzes = deduplicated;

      if (user.role === 'PARTICIPANT') {
        const participant = db.find('participants', (p) =>
          p.id === user.id ||
          (p.email && p.email.toLowerCase() === (user.email || '').toLowerCase()) ||
          p.participant_id === user.id
        );

        const possibleUserIds = new Set([
          user.id,
          user.email ? user.email.toLowerCase() : null,
          participant ? participant.id : null,
          participant ? participant.participant_id : null,
          participant ? participant.registration_number : null
        ].filter(Boolean));

        const allAssignments = db.get('quiz_assignments') || [];
        const assignments = allAssignments.filter((a) => 
          possibleUserIds.has(a.participant_id) || 
          (a.participant_id && possibleUserIds.has(a.participant_id.toLowerCase()))
        );
        const assignedQuizIds = new Set(assignments.map((a) => a.quiz_id));

        if (participant && Array.isArray(participant.assigned_quiz_ids)) {
          participant.assigned_quiz_ids.forEach((id) => assignedQuizIds.add(id));
        }

        quizzes = quizzes.filter((q) => {
          return assignedQuizIds.has(q.id);
        });

        // Attach participant's attempt status and results
        const allAttempts = db.get('exam_attempts') || [];
        const allResults = db.get('results') || [];
        const participantAttempts = allAttempts.filter((a) => possibleUserIds.has(a.participant_id));
        const participantResults = allResults.filter((r) => possibleUserIds.has(r.participant_id));

        const TimerService = require('../services/timerService');
        const enriched = quizzes.map((q) => {
          const attempt = participantAttempts.find((a) => a.quiz_id === q.id);
          const result = participantResults.find((r) => r.quiz_id === q.id);
          const windowStatus = ScheduleService.getEntryWindowStatus(q);

          // Determine accurate attempt status
          let resolvedAttemptStatus = 'NOT_STARTED';
          if (attempt) {
            if (
              attempt.status === 'TERMINATED' ||
              attempt.status === 'DISQUALIFIED' ||
              Boolean(attempt.termination_reason) ||
              result?.status === 'TERMINATED'
            ) {
              resolvedAttemptStatus = 'TERMINATED';
              if (attempt.status !== 'TERMINATED' && attempt.status !== 'DISQUALIFIED') {
                attempt.status = 'TERMINATED';
                db.update('exam_attempts', (a) => a.id === attempt.id, { status: 'TERMINATED' });
              }
            } else if (
              attempt.status === 'COMPLETED' ||
              Boolean(attempt.submitted_at) ||
              result?.status === 'COMPLETED' ||
              (attempt.status === 'IN_PROGRESS' && TimerService.isExpired(attempt.expires_at))
            ) {
              resolvedAttemptStatus = 'COMPLETED';
              if (attempt.status !== 'COMPLETED') {
                attempt.status = 'COMPLETED';
                db.update('exam_attempts', (a) => a.id === attempt.id, { status: 'COMPLETED' });
              }
            } else {
              resolvedAttemptStatus = attempt.status || 'IN_PROGRESS';
            }
          }

          // Determine effective dynamic status
          let effectiveStatus = q.status;
          if (resolvedAttemptStatus === 'COMPLETED' || resolvedAttemptStatus === 'TERMINATED') {
            effectiveStatus = 'Completed';
          } else if (windowStatus.isAfterEnd) {
            effectiveStatus = 'Completed';
          } else if (windowStatus.isBeforeStart) {
            effectiveStatus = 'Scheduled';
          } else if (windowStatus.isEntryOpen || q.status === 'Live') {
            effectiveStatus = 'Live';
          }

          return {
            ...q,
            status: effectiveStatus,
            entry_window_status: windowStatus,
            attempt_status: resolvedAttemptStatus,
            attempt_id: attempt ? attempt.id : null,
            result_summary: result
              ? {
                  score: result.final_score,
                  percentage: result.percentage,
                  rank: result.rank,
                  is_passed: result.is_passed,
                  status: result.status
                }
              : null
          };
        });

        return success(res, enriched);
      }

      // For admin: enrich with question count & assigned count
      const enrichedAdmin = quizzes.map((q) => {
        const roundQuestions = db.filter('questions', (quest) => {
          const matchesRound = Number(quest.round_number) === Number(q.round_number);
          const matchesEvent = !quest.event_name || quest.event_name === q.event_name || quest.event_name === q.title;
          return matchesRound && matchesEvent;
        });
        const qCount = db.filter('quiz_questions', (qq) => qq.quiz_id === q.id).length || roundQuestions.length;
        const assignedCount = db.filter('quiz_assignments', (qa) => qa.quiz_id === q.id).length;
        const attemptsCount = db.filter('exam_attempts', (ea) => ea.quiz_id === q.id).length;
        const parentEvent = events.find(e => e.id === q.event_id || (q.event_name && e.title.toLowerCase() === q.event_name.toLowerCase()));
        return {
          ...q,
          event_code: q.event_code || parentEvent?.code || 'ELQ26',
          entry_window_status: ScheduleService.getEntryWindowStatus(q),
          total_questions: qCount || q.total_questions || 0,
          assigned_participants_count: assignedCount,
          total_attempts_count: attemptsCount
        };
      });

      // Deduplicate by unique quiz ID
      const uniqueAdminMap = new Map();
      enrichedAdmin.forEach((q) => {
        if (q.id && !uniqueAdminMap.has(q.id)) {
          uniqueAdminMap.set(q.id, q);
        }
      });

      return success(res, Array.from(uniqueAdminMap.values()));
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get single quiz details
   */
  static async getQuizById(req, res) {
    try {
      // Auto-publish check
      ScheduleService.checkAndPublishScheduledQuizzes();

      const { id } = req.params;
      const quiz = db.find('quizzes', (q) => q.id === id);
      if (!quiz) return error(res, 'Quiz not found', 404);

      const quizQuestions = db.filter('quiz_questions', (qq) => qq.quiz_id === id);
      let questions = [];

      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR'].includes(req.user.role) || ['ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR'].includes(req.user.admin_level);

      if (quizQuestions.length > 0) {
        const questionIds = quizQuestions.map((qq) => qq.question_id);
        if (isStaff) {
          questions = db.filter('questions', (q) => questionIds.includes(q.id));
        }
      } else {
        const roundQuestions = db.filter('questions', (q) => {
          const matchesRound = Number(q.round_number) === Number(quiz.round_number);
          const matchesEvent = !q.event_name || q.event_name === quiz.event_name || q.event_name === quiz.title;
          return matchesRound && matchesEvent;
        });
        if (isStaff) {
          questions = roundQuestions;
        }
      }

      const assignedParticipants = db.filter('quiz_assignments', (qa) => qa.quiz_id === id);
      const totalQCount = quizQuestions.length > 0 ? quizQuestions.length : (questions.length || quiz.total_questions || 0);

      return success(res, {
        ...quiz,
        entry_window_status: ScheduleService.getEntryWindowStatus(quiz),
        total_questions: totalQCount,
        questions: isStaff ? questions : undefined,
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
        event_name,
        event_code,
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
        entry_window_minutes = 5,
        allow_late_entry = false,
        question_ids = []
      } = req.body;

      if (!title || !start_date || !end_date) {
        return error(res, 'Title, start date, and end date are required', 400);
      }

      // Sync or create the Event in the events collection
      const eventTitle = (event_name && event_name.trim()) || title.trim();
      const codeClean = event_code ? event_code.trim().toUpperCase() : (eventTitle.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || 'ELQ26');
      
      let eventRecord = db.find('events', (e) => (e.code && e.code.toUpperCase() === codeClean) || e.title.toLowerCase() === eventTitle.toLowerCase());
      if (!eventRecord) {
        eventRecord = db.insert('events', {
          title: eventTitle,
          code: codeClean,
          description: description || `${eventTitle} symposium event`,
          is_active: true
        });
      }

      const numRound = Number(round_number) || 1;
      let roundRecord = db.find('rounds', (r) => r.round_number === numRound && (r.event_id === eventRecord.id || !r.event_id));
      if (!roundRecord) {
        roundRecord = db.insert('rounds', {
          event_id: eventRecord.id,
          round_number: numRound,
          round_name: `Round ${numRound}`,
          description: `Symposium Examination Round ${numRound}`,
          is_active: true,
          is_published: ['Published', 'Live'].includes(status)
        });
      }

      // Auto resolve questions from Question Bank matching this event and round if not explicitly provided
      let resolvedQuestionIds = Array.isArray(question_ids) && question_ids.length > 0 ? question_ids : [];
      if (resolvedQuestionIds.length === 0) {
        const matchingQuestions = db.filter('questions', (q) => {
          const matchesRound = Number(q.round_number) === numRound;
          const matchesEvent = !q.event_name || q.event_name === eventRecord.title || q.event_name === title;
          return matchesRound && matchesEvent;
        });
        resolvedQuestionIds = matchingQuestions.map((q) => q.id);
      }

      // Check if a quiz already exists for this event and round number
      const existingQuiz = db.find(
        'quizzes',
        (q) =>
          (q.event_id === eventRecord.id || (q.event_name && q.event_name.toLowerCase() === eventRecord.title.toLowerCase())) &&
          Number(q.round_number) === numRound
      );

      if (existingQuiz) {
        // Update existing examination rather than creating a duplicate
        const updatedQuiz = db.update('quizzes', (q) => q.id === existingQuiz.id, {
          title: title || existingQuiz.title,
          description: description !== undefined ? description : existingQuiz.description,
          event_id: eventRecord.id,
          event_name: eventRecord.title,
          round_id: roundRecord.id,
          round_number: numRound,
          duration_minutes: Number(duration_minutes) || existingQuiz.duration_minutes || 30,
          start_date: start_date || existingQuiz.start_date,
          start_time: start_time || existingQuiz.start_time,
          end_date: end_date || existingQuiz.end_date,
          end_time: end_time || existingQuiz.end_time,
          max_marks: Number(max_marks) || existingQuiz.max_marks || 100,
          pass_percentage: Number(pass_percentage) || existingQuiz.pass_percentage || 40,
          negative_marking: Boolean(negative_marking),
          negative_mark_value: Number(negative_mark_value) || 0,
          max_attempts: Number(max_attempts) || 1,
          status: status || existingQuiz.status,
          desktop_only: Boolean(desktop_only),
          fullscreen_required: Boolean(fullscreen_required),
          max_violations: Number(max_violations) || 1,
          shuffle_questions: Boolean(shuffle_questions),
          shuffle_options: Boolean(shuffle_options),
          total_questions: resolvedQuestionIds.length > 0 ? resolvedQuestionIds.length : (existingQuiz.total_questions || 0)
        });

        if (resolvedQuestionIds.length > 0) {
          db.remove('quiz_questions', (qq) => qq.quiz_id === existingQuiz.id);
          resolvedQuestionIds.forEach((qId, index) => {
            db.insert('quiz_questions', {
              quiz_id: existingQuiz.id,
              question_id: qId,
              display_order: index + 1
            });
          });
        }

        AuditService.log(req.user.id, 'UPDATE_QUIZ_SCHEDULE', 'QUIZ', existingQuiz.id, { title: updatedQuiz.title });
        SocketService.notifyQuizUpdate({ quiz_id: existingQuiz.id, status: updatedQuiz.status, event_id: eventRecord.id });

        return success(res, updatedQuiz, 'Examination schedule updated successfully');
      }

      const newQuiz = db.insert('quizzes', {
        title,
        description,
        event_id: eventRecord.id,
        event_name: eventRecord.title,
        round_id: roundRecord.id,
        round_number: numRound,
        total_questions: resolvedQuestionIds.length,
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

      // Link questions
      if (resolvedQuestionIds.length > 0) {
        resolvedQuestionIds.forEach((qId, index) => {
          db.insert('quiz_questions', {
            quiz_id: newQuiz.id,
            question_id: qId,
            display_order: index + 1
          });
        });
      }

      AuditService.log(req.user.id, 'CREATE_QUIZ', 'QUIZ', newQuiz.id, { title: newQuiz.title, event_code: eventRecord.code });
      SocketService.notifyQuizUpdate({ quiz_id: newQuiz.id, status: newQuiz.status, event_id: eventRecord.id });

      return success(res, newQuiz, 'Event & Quiz created successfully', 201);
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

      if (updates.event_code) {
        updates.event_code = updates.event_code.trim().toUpperCase();
      }

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
        let roundRecord = db.find('rounds', (r) => r.round_number === numRound && (!existing.event_id || r.event_id === existing.event_id));
        if (!roundRecord) {
          roundRecord = db.insert('rounds', {
            event_id: existing.event_id || 'c0000000-0000-0000-0000-000000000001',
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

      // Sync event record if title or code updated
      if (existing.event_id && (updates.event_name || updates.event_code || updates.description)) {
        db.update('events', (e) => e.id === existing.event_id, {
          ...(updates.event_name ? { title: updates.event_name } : {}),
          ...(updates.event_code ? { code: updates.event_code } : {}),
          ...(updates.description ? { description: updates.description } : {})
        });
      }

      AuditService.log(req.user.id, 'UPDATE_QUIZ', 'QUIZ', id, { updates });
      SocketService.notifyQuizUpdate({ quiz_id: id, status: updated.status, event_id: updated.event_id });

      return success(res, updated, 'Event updated successfully');
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

      // If no other quizzes use this event_id, clean up the event
      if (existing.event_id) {
        const otherQuizzesWithEvent = db.find('quizzes', (q) => q.event_id === existing.event_id);
        if (!otherQuizzesWithEvent) {
          db.remove('events', (e) => e.id === existing.event_id);
        }
      }

      AuditService.log(req.user.id, 'DELETE_QUIZ', 'QUIZ', id, { title: existing.title });
      SocketService.notifyQuizUpdate({ quiz_id: id, deleted: true, event_id: existing.event_id });

      return success(res, {}, 'Event and Quiz deleted successfully');
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

      SocketService.notifyQuizUpdate({ quiz_id: id, status });

      return success(res, updated, `Quiz status changed to ${status}`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Toggle or configure late entry for a quiz (Admin only)
   */
  static async updateEntryControl(req, res) {
    try {
      const { id } = req.params;
      const { allow_late_entry } = req.body;

      let quiz = db.find('quizzes', (q) => q.id === id);
      if (!quiz) {
        quiz = db.find('quizzes', (q) => q.event_id === id || q.title?.toLowerCase() === id.toLowerCase());
      }
      if (!quiz) return error(res, 'Quiz not found', 404);

      const updated = db.update(
        'quizzes',
        (q) => q.id === quiz.id,
        {
          allow_late_entry: Boolean(allow_late_entry),
          late_entry_allowed: Boolean(allow_late_entry)
        }
      );

      AuditService.log(req.user?.id || 'ADMIN', 'UPDATE_ENTRY_CONTROL', 'QUIZ', quiz.id, {
        allow_late_entry: Boolean(allow_late_entry)
      });

      SocketService.notifyQuizUpdate({ quiz_id: quiz.id, allow_late_entry: Boolean(allow_late_entry) });

      return success(
        res,
        updated,
        allow_late_entry
          ? 'Late entry unlocked. Participants can now enter this exam.'
          : 'Late entry locked. Initial 5-minute window rule enforced.'
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = QuizController;
