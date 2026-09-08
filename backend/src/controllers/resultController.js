const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');

class ResultController {
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

      // Sort by rank ascending
      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      const enriched = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        const pViolations = violations.filter((v) => v.attempt_id === r.attempt_id);

        return {
          ...r,
          participant_name: p ? p.full_name : 'Unknown',
          participant_id_str: p ? p.participant_id : 'N/A',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          round_1_selected: p ? Boolean(p.round_1_selected) : false,
          violations_count: pViolations.length
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

      // If participant requesting and detailed results are disabled by admin
      if (req.user.role === 'PARTICIPANT') {
        const userResult = filtered.find((r) => r.participant_id === req.user.id);
        if (!userResult) return error(res, 'No completed result found for your attempt', 404);

        if (!quiz.show_detailed_results) {
          return success(res, {
            score: userResult.final_score,
            percentage: userResult.percentage,
            status: userResult.status,
            is_passed: userResult.is_passed,
            rank: userResult.rank
          });
        }
        return success(res, userResult);
      }

      return success(res, {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          round_number: quiz.round_number,
          max_marks: quiz.max_marks,
          pass_percentage: quiz.pass_percentage
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

      if (req.user.role === 'PARTICIPANT' && attempt.participant_id !== req.user.id) {
        return error(res, 'Unauthorized to view this result', 403);
      }

      const result = db.find('results', (r) => r.attempt_id === attemptId);
      if (!result) return error(res, 'Result not generated yet for this attempt', 404);

      const quiz = db.find('quizzes', (q) => q.id === attempt.quiz_id);
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
