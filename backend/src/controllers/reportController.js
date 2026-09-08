const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');

class ReportController {
  /**
   * Export Quiz Results CSV data
   */
  static async exportQuizResultsCSV(req, res) {
    try {
      const { quizId } = req.params;
      const results = db.filter('results', (r) => r.quiz_id === quizId);
      const participants = db.get('participants');
      const quiz = db.find('quizzes', (q) => q.id === quizId);

      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      const rows = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        return {
          Rank: r.rank || 'N/A',
          Participant_ID: p ? p.participant_id : 'N/A',
          Name: p ? p.full_name : 'Unknown',
          College: p ? p.college : 'N/A',
          Department: p ? p.department : 'N/A',
          Score: r.final_score,
          Percentage: `${r.percentage}%`,
          Correct: r.correct_answers,
          Wrong: r.wrong_answers,
          Unanswered: r.unanswered_questions,
          Time_Taken_Seconds: r.time_taken_seconds,
          Status: r.status,
          Round_Selected: p ? (p.round_1_selected ? 'YES' : 'NO') : 'NO'
        };
      });

      return success(res, {
        quiz_title: quiz ? quiz.title : 'Quiz Results',
        rows
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Export All Participants List
   */
  static async exportParticipantsCSV(req, res) {
    try {
      const participants = db.get('participants');
      const rows = participants.map((p) => ({
        Participant_ID: p.participant_id,
        Name: p.full_name,
        Email: p.email,
        Mobile: p.mobile,
        College: p.college,
        Department: p.department,
        Year: p.year,
        Event: p.event,
        Registration_Number: p.registration_number,
        Round_1_Selected: p.round_1_selected ? 'YES' : 'NO',
        Round_2_Selected: p.round_2_selected ? 'YES' : 'NO',
        Disabled: p.is_disabled ? 'YES' : 'NO'
      }));

      return success(res, { rows });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = ReportController;
