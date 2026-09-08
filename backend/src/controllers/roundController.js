const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const RoundSelectionService = require('../services/roundSelectionService');
const AuditService = require('../services/auditService');

class RoundController {
  /**
   * Get Round 1 Leaderboard for Round Selection Panel
   */
  static async getRound1Ranking(req, res) {
    try {
      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1);
      if (!round1Quiz) {
        return error(res, 'Round 1 Quiz not configured yet', 404);
      }

      const results = db.filter('results', (r) => r.quiz_id === round1Quiz.id);
      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      const participants = db.get('participants');
      const rankingList = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        return {
          participant_id: r.participant_id,
          participant_code: p ? p.participant_id : 'N/A',
          full_name: p ? p.full_name : 'Unknown',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          score: r.final_score,
          percentage: r.percentage,
          rank: r.rank,
          selected: p ? Boolean(p.round_1_selected) : false,
          attempt_status: r.status
        };
      });

      return success(res, {
        quiz: {
          id: round1Quiz.id,
          title: round1Quiz.title,
          max_marks: round1Quiz.max_marks
        },
        total_participants: rankingList.length,
        selected_count: rankingList.filter((r) => r.selected).length,
        rankings: rankingList
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Auto Select Top N Participants
   */
  static async autoSelectTopN(req, res) {
    try {
      const { top_n = 10, quiz_id } = req.body;
      let targetQuizId = quiz_id;

      if (!targetQuizId) {
        const r1Quiz = db.find('quizzes', (q) => q.round_number === 1);
        if (!r1Quiz) return error(res, 'Round 1 Quiz not found', 404);
        targetQuizId = r1Quiz.id;
      }

      const selected = RoundSelectionService.autoSelectTopN(targetQuizId, Number(top_n), req.user.id);

      AuditService.log(req.user.id, 'AUTO_SELECT_TOP_N', 'ROUND_SELECTION', targetQuizId, {
        top_n: Number(top_n),
        selected_count: selected.filter((s) => s.selected).length
      });

      return success(res, selected, `Successfully selected Top ${top_n} participants for Round 2`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Manually Toggle Individual Selection
   */
  static async toggleParticipantSelection(req, res) {
    try {
      const { participant_id, selected, round_number = 1 } = req.body;
      if (!participant_id) return error(res, 'Participant ID is required', 400);

      const updated = RoundSelectionService.toggleParticipantSelection(
        participant_id,
        Number(round_number),
        Boolean(selected),
        req.user.id
      );

      AuditService.log(req.user.id, 'MANUAL_TOGGLE_ROUND_SELECTION', 'PARTICIPANT', participant_id, {
        selected: Boolean(selected),
        round_number
      });

      return success(res, updated, 'Participant selection status updated');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Publish Round Selection to Participants
   */
  static async publishRoundSelection(req, res) {
    try {
      const { round_number = 1 } = req.body;
      const round = db.find('rounds', (r) => r.round_number === Number(round_number));
      if (round) {
        db.update('rounds', (r) => r.id === round.id, { is_published: true });
      }

      // Auto assign selected participants to Round 2 Quiz
      const round2Quiz = db.find('quizzes', (q) => q.round_number === 2);
      if (round2Quiz) {
        const selectedParticipants = db.filter('participants', (p) => p.round_1_selected);
        selectedParticipants.forEach((p) => {
          const existing = db.find(
            'quiz_assignments',
            (qa) => qa.quiz_id === round2Quiz.id && qa.participant_id === p.id
          );
          if (!existing) {
            db.insert('quiz_assignments', {
              quiz_id: round2Quiz.id,
              participant_id: p.id,
              assigned_by: req.user.id,
              status: 'ASSIGNED'
            });
          }
        });
      }

      // Post Announcement
      db.insert('announcements', {
        title: `Round ${round_number} Official Selection Published!`,
        message: `The official qualifiers list for Round ${Number(round_number) + 1} is now published. Check your dashboard for qualification status.`,
        target_type: 'ALL',
        created_by: req.user.id
      });

      AuditService.log(req.user.id, 'PUBLISH_ROUND_SELECTIONS', 'ROUND', String(round_number));

      return success(res, {}, `Round ${round_number} selections officially published`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Participant Round 2 Status & Schedule
   */
  static async getParticipantRoundStatus(req, res) {
    try {
      const participant = db.find('participants', (p) => p.id === req.user.id);
      if (!participant) return error(res, 'Participant not found', 404);

      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1);
      const round2Quiz = db.find('quizzes', (q) => q.round_number === 2);

      const r1Result = round1Quiz ? db.find('results', (r) => r.quiz_id === round1Quiz.id && r.participant_id === req.user.id) : null;
      const r2Attempt = round2Quiz ? db.find('exam_attempts', (a) => a.quiz_id === round2Quiz.id && a.participant_id === req.user.id) : null;

      return success(res, {
        round_1_selected: Boolean(participant.round_1_selected),
        round_1_result: r1Result
          ? {
              score: r1Result.final_score,
              rank: r1Result.rank,
              percentage: r1Result.percentage,
              status: r1Result.status
            }
          : null,
        round_2_quiz: round2Quiz
          ? {
              id: round2Quiz.id,
              title: round2Quiz.title,
              start_date: round2Quiz.start_date,
              start_time: round2Quiz.start_time,
              end_date: round2Quiz.end_date,
              end_time: round2Quiz.end_time,
              duration_minutes: round2Quiz.duration_minutes,
              total_questions: round2Quiz.total_questions,
              status: round2Quiz.status,
              attempt_status: r2Attempt ? r2Attempt.status : 'NOT_STARTED'
            }
          : null
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = RoundController;
