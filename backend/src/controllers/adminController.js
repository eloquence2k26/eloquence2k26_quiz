const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class AdminController {
  /**
   * Get Admin Dashboard Analytics & Charts Data
   */
  static async getDashboardStats(req, res) {
    try {
      const participants = db.get('participants');
      const quizzes = db.get('quizzes');
      const attempts = db.get('exam_attempts');
      const results = db.get('results');
      const violations = db.get('security_violations');

      const totalParticipants = participants.length;
      const registeredParticipants = participants.filter((p) => !p.is_disabled).length;
      const activeExams = quizzes.filter((q) => q.status === 'Live').length;
      const completedExams = attempts.filter((a) => a.status === 'COMPLETED').length;
      const terminatedExams = attempts.filter((a) => a.status === 'TERMINATED' || a.status === 'DISQUALIFIED').length;
      const selectedParticipants = participants.filter((p) => p.round_1_selected || p.round_2_selected).length;

      let avgScore = 0;
      let highestScore = 0;
      if (results.length > 0) {
        const total = results.reduce((acc, r) => acc + (Number(r.final_score) || 0), 0);
        avgScore = Number((total / results.length).toFixed(2));
        highestScore = Math.max(...results.map((r) => Number(r.final_score) || 0));
      }

      // Chart 1: Score distribution buckets
      const scoreBuckets = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
      results.forEach((r) => {
        const pct = r.percentage || 0;
        if (pct <= 20) scoreBuckets['0-20%']++;
        else if (pct <= 40) scoreBuckets['21-40%']++;
        else if (pct <= 60) scoreBuckets['41-60%']++;
        else if (pct <= 80) scoreBuckets['61-80%']++;
        else scoreBuckets['81-100%']++;
      });

      // Chart 2: Completed vs Terminated vs In-Progress
      const attemptBreakdown = {
        Completed: completedExams,
        Terminated: terminatedExams,
        'In Progress': attempts.filter((a) => a.status === 'IN_PROGRESS').length
      };

      // Chart 3: Round-wise Performance
      const round1Quiz = quizzes.find((q) => q.round_number === 1);
      const round2Quiz = quizzes.find((q) => q.round_number === 2);

      const round1Results = round1Quiz ? results.filter((r) => r.quiz_id === round1Quiz.id) : [];
      const round2Results = round2Quiz ? results.filter((r) => r.quiz_id === round2Quiz.id) : [];

      const roundWiseData = [
        {
          round: 'Round 1 (Prelims)',
          attempts: round1Results.length,
          avgScore: round1Results.length ? Number((round1Results.reduce((s, r) => s + r.final_score, 0) / round1Results.length).toFixed(2)) : 0,
          passRate: round1Results.length ? Math.round((round1Results.filter((r) => r.is_passed).length / round1Results.length) * 100) : 0
        },
        {
          round: 'Round 2 (Grand Finals)',
          attempts: round2Results.length,
          avgScore: round2Results.length ? Number((round2Results.reduce((s, r) => s + r.final_score, 0) / round2Results.length).toFixed(2)) : 0,
          passRate: round2Results.length ? Math.round((round2Results.filter((r) => r.is_passed).length / round2Results.length) * 100) : 0
        }
      ];

      return success(res, {
        kpis: {
          totalParticipants,
          registeredParticipants,
          activeExams,
          completedExams,
          terminatedExams,
          selectedParticipants,
          averageScore: avgScore,
          highestScore: highestScore
        },
        charts: {
          scoreDistribution: scoreBuckets,
          attemptBreakdown,
          roundWiseData
        },
        recentViolationsCount: violations.length
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get System Settings
   */
  static async getSettings(req, res) {
    try {
      const settings = db.get('system_settings');
      return success(res, settings);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update System Settings
   */
  static async updateSettings(req, res) {
    try {
      const updates = req.body;
      const current = db.get('system_settings');
      const updated = { ...current, ...updates };
      db.set('system_settings', updated);

      AuditService.log(req.user.id, 'UPDATE_SETTINGS', 'SYSTEM', 'CONFIG', updates);

      return success(res, updated, 'Settings updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Audit Logs
   */
  static async getAuditLogs(req, res) {
    try {
      const logs = db.get('audit_logs');
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return success(res, logs);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AdminController;
