const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class ParticipantController {
  /**
   * Get all participants (with filters for college, event, round selection, disabled)
   */
  static async getAllParticipants(req, res) {
    try {
      const { search, college, round_1_selected, is_disabled } = req.query;
      let participants = db.get('participants');

      if (college) {
        participants = participants.filter((p) => p.college.toLowerCase().includes(college.toLowerCase()));
      }
      if (round_1_selected !== undefined) {
        const boolVal = round_1_selected === 'true';
        participants = participants.filter((p) => Boolean(p.round_1_selected) === boolVal);
      }
      if (is_disabled !== undefined) {
        const boolVal = is_disabled === 'true';
        participants = participants.filter((p) => Boolean(p.is_disabled) === boolVal);
      }
      if (search) {
        const term = search.toLowerCase();
        participants = participants.filter((p) =>
          p.full_name.toLowerCase().includes(term) ||
          p.participant_id.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.college.toLowerCase().includes(term)
        );
      }

      // Enrich with assigned quizzes count
      const assignments = db.get('quiz_assignments');
      const enriched = participants.map((p) => {
        const pAssignments = assignments.filter((a) => a.participant_id === p.id);
        return {
          ...p,
          assigned_quizzes_count: pAssignments.length
        };
      });

      return success(res, enriched);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get single participant details
   */
  static async getParticipantById(req, res) {
    try {
      const { id } = req.params;
      const participant = db.find('participants', (p) => p.id === id);
      if (!participant) return error(res, 'Participant not found', 404);

      const attempts = db.filter('exam_attempts', (a) => a.participant_id === id);
      const results = db.filter('results', (r) => r.participant_id === id);
      const assignments = db.filter('quiz_assignments', (qa) => qa.participant_id === id);

      return success(res, {
        ...participant,
        attempts,
        results,
        assignments
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Toggle disabled/active status of participant
   */
  static async toggleDisableParticipant(req, res) {
    try {
      const { id } = req.params;
      const { is_disabled } = req.body;

      const participant = db.find('participants', (p) => p.id === id);
      if (!participant) return error(res, 'Participant not found', 404);

      const updated = db.update('participants', (p) => p.id === id, {
        is_disabled: Boolean(is_disabled)
      });

      // Also toggle users table is_active
      db.update('users', (u) => u.id === id, {
        is_active: !Boolean(is_disabled)
      });

      AuditService.log(req.user.id, 'TOGGLE_PARTICIPANT_STATUS', 'PARTICIPANT', id, {
        is_disabled: Boolean(is_disabled),
        participant_id: participant.participant_id
      });

      return success(res, updated, `Participant account ${is_disabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete participant
   */
  static async deleteParticipant(req, res) {
    try {
      const { id } = req.params;
      const participant = db.find('participants', (p) => p.id === id);
      if (!participant) return error(res, 'Participant not found', 404);

      db.remove('participants', (p) => p.id === id);
      db.remove('users', (u) => u.id === id);
      db.remove('profiles', (p) => p.id === id);
      db.remove('quiz_assignments', (qa) => qa.participant_id === id);
      db.remove('exam_attempts', (ea) => ea.participant_id === id);
      db.remove('results', (r) => r.participant_id === id);

      AuditService.log(req.user.id, 'DELETE_PARTICIPANT', 'PARTICIPANT', id, {
        participant_id: participant.participant_id,
        email: participant.email
      });

      return success(res, {}, 'Participant deleted successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Assign participants to a quiz
   */
  static async assignToQuiz(req, res) {
    try {
      const { quiz_id, participant_ids = [], assign_all = false } = req.body;
      if (!quiz_id) return error(res, 'Quiz ID is required', 400);

      const quiz = db.find('quizzes', (q) => q.id === quiz_id);
      if (!quiz) return error(res, 'Quiz not found', 404);

      let targetIds = participant_ids;
      if (assign_all) {
        targetIds = db.get('participants').map((p) => p.id);
      }

      let assignedCount = 0;
      targetIds.forEach((pId) => {
        const existing = db.find('quiz_assignments', (qa) => qa.quiz_id === quiz_id && qa.participant_id === pId);
        if (!existing) {
          db.insert('quiz_assignments', {
            quiz_id,
            participant_id: pId,
            assigned_by: req.user.id,
            status: 'ASSIGNED'
          });
          assignedCount++;
        }
      });

      AuditService.log(req.user.id, 'ASSIGN_PARTICIPANTS_TO_QUIZ', 'QUIZ', quiz_id, { count: assignedCount });

      return success(res, { assignedCount }, `Successfully assigned ${assignedCount} participants to quiz.`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = ParticipantController;
