const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');

class SecurityController {
  /**
   * Get all security violations (Admin)
   */
  static async getAllViolations(req, res) {
    try {
      const { violation_type, severity, search } = req.query;
      let violations = db.get('security_violations');
      const participants = db.get('participants');
      const quizzes = db.get('quizzes');

      violations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const enriched = violations.map((v) => {
        const p = participants.find((part) => part.id === v.participant_id);
        const q = quizzes.find((quiz) => quiz.id === v.quiz_id);
        return {
          ...v,
          participant_name: p ? p.full_name : 'Unknown',
          participant_code: p ? p.participant_id : 'N/A',
          college: p ? p.college : 'N/A',
          quiz_title: q ? q.title : 'Quiz'
        };
      });

      let filtered = enriched;
      if (violation_type) {
        filtered = filtered.filter((v) => v.violation_type === violation_type);
      }
      if (severity) {
        filtered = filtered.filter((v) => v.severity === severity);
      }
      if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter((v) =>
          v.participant_name.toLowerCase().includes(term) ||
          v.participant_code.toLowerCase().includes(term) ||
          v.violation_type.toLowerCase().includes(term) ||
          v.college.toLowerCase().includes(term)
        );
      }

      return success(res, filtered);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get violation stats summary
   */
  static async getViolationStats(req, res) {
    try {
      const violations = db.get('security_violations');

      const byType = {};
      const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

      violations.forEach((v) => {
        byType[v.violation_type] = (byType[v.violation_type] || 0) + 1;
        if (v.severity && bySeverity[v.severity] !== undefined) {
          bySeverity[v.severity]++;
        }
      });

      return success(res, {
        total_violations: violations.length,
        by_type: byType,
        by_severity: bySeverity
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = SecurityController;
