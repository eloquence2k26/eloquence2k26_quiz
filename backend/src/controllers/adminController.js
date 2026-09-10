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
          round: 'Round 1',
          attempts: round1Results.length,
          avgScore: round1Results.length ? Number((round1Results.reduce((s, r) => s + r.final_score, 0) / round1Results.length).toFixed(2)) : 0,
          passRate: round1Results.length ? Math.round((round1Results.filter((r) => r.is_passed).length / round1Results.length) * 100) : 0
        },
        {
          round: 'Round 2',
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

  /**
   * Get all registered events and competitions (with metadata for rounds, schedule & questions)
   */
  static async getEvents(req, res) {
    try {
      const events = db.get('events') || [];
      const quizzes = db.get('quizzes') || [];
      const rounds = db.get('rounds') || [];
      const questions = db.get('questions') || [];
      const eventMap = new Map();

      // Seed existing event records
      events.forEach((e) => {
        if (e.title) {
          eventMap.set(e.title.toLowerCase(), {
            id: e.id,
            title: e.title,
            code: e.code || 'ELQ26',
            description: e.description || '',
            is_active: e.is_active !== false,
            created_at: e.created_at
          });
        }
      });

      // Gather distinct events from quizzes as well
      quizzes.forEach((q) => {
        const title = q.event_name || q.title;
        if (title && !eventMap.has(title.toLowerCase())) {
          eventMap.set(title.toLowerCase(), {
            id: q.event_id || q.id,
            title,
            code: q.event_code || 'ELQ26',
            description: q.description || '',
            is_active: true,
            created_at: q.created_at
          });
        }
      });

      // If empty, supply default Eloquence 2026
      if (eventMap.size === 0) {
        eventMap.set('eloquence 2026', {
          id: 'c0000000-0000-0000-0000-000000000001',
          title: 'Eloquence 2026',
          code: 'ELQ26',
          description: 'Official National Symposium Technical MCQ Championship',
          is_active: true,
          created_at: new Date().toISOString()
        });
      }

      // Enrich with rounds count, questions count, and status
      const enrichedEvents = Array.from(eventMap.values()).map((ev) => {
        const eventRounds = rounds.filter(
          (r) => r.event_id === ev.id || (r.event_name && r.event_name.toLowerCase() === ev.title.toLowerCase())
        );
        const eventQuestions = questions.filter(
          (q) => q.event_name && q.event_name.toLowerCase() === ev.title.toLowerCase()
        );
        const eventQuizzes = quizzes.filter(
          (q) => q.event_id === ev.id || (q.event_name && q.event_name.toLowerCase() === ev.title.toLowerCase())
        );

        return {
          ...ev,
          rounds_count: eventRounds.length,
          questions_count: eventQuestions.length,
          quizzes_count: eventQuizzes.length,
          schedule_status: eventQuizzes.length > 0 ? eventQuizzes[0].status : 'Draft'
        };
      });

      return success(res, enrichedEvents);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create a new event (pure event creation without overlapping schedule/rounds/questions)
   */
  static async createEvent(req, res) {
    try {
      const { title, description, code, is_active = true } = req.body;

      if (!title || !title.trim()) {
        return error(res, 'Event Title / Name is required', 400);
      }

      const cleanTitle = title.trim();
      const cleanCode = (code && code.trim()) || `EVT-${cleanTitle.slice(0, 4).toUpperCase()}`;

      // Check if event already exists
      const existingEvents = db.get('events') || [];
      const duplicate = existingEvents.find(
        (e) => e.title.toLowerCase() === cleanTitle.toLowerCase() || (code && e.code.toLowerCase() === cleanCode.toLowerCase())
      );
      if (duplicate) {
        return error(res, `An event named "${cleanTitle}" already exists.`, 409);
      }

      const newEvent = db.insert('events', {
        title: cleanTitle,
        code: cleanCode,
        description: description ? description.trim() : '',
        is_active: Boolean(is_active)
      });

      // Auto-provision standard Round 1 & Round 2 in rounds table
      const r1 = db.insert('rounds', {
        event_id: newEvent.id,
        event_name: cleanTitle,
        round_number: 1,
        round_name: 'Round 1',
        description: `${cleanTitle} Examination Round 1`,
        is_active: true,
        is_published: false
      });

      const r2 = db.insert('rounds', {
        event_id: newEvent.id,
        event_name: cleanTitle,
        round_number: 2,
        round_name: 'Round 2',
        description: `${cleanTitle} Examination Round 2`,
        is_active: true,
        is_published: false
      });

      // Provision initial quiz record so schedule and questions pages have an anchor
      db.insert('quizzes', {
        event_id: newEvent.id,
        round_id: r1.id,
        title: cleanTitle,
        event_name: cleanTitle,
        event_code: cleanCode,
        description: description ? description.trim() : `${cleanTitle} Examination`,
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

      AuditService.log(req.user.id, 'CREATE_EVENT', 'EVENT', newEvent.id, {
        title: newEvent.title,
        code: newEvent.code
      });

      return success(res, newEvent, 'Event created successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update an existing event
   */
  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const { title, description, code, is_active } = req.body;

      const events = db.get('events') || [];
      const event = events.find((e) => e.id === id);

      const updates = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description ? description.trim() : '';
      if (code !== undefined) updates.code = code.trim();
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      let updatedEvent;
      if (event) {
        updatedEvent = db.update('events', (e) => e.id === id, updates);
      } else {
        // If event only existed via quizzes, insert into events table
        updatedEvent = db.insert('events', {
          id,
          title: updates.title || 'Competition Event',
          code: updates.code || 'ELQ26',
          description: updates.description || '',
          is_active: updates.is_active !== undefined ? updates.is_active : true
        });
      }

      // If title changed, sync event_name across rounds and quizzes
      if (updates.title) {
        const rounds = db.get('rounds') || [];
        rounds.forEach((r) => {
          if (r.event_id === id) {
            db.update('rounds', (item) => item.id === r.id, { event_name: updates.title });
          }
        });

        const quizzes = db.get('quizzes') || [];
        quizzes.forEach((q) => {
          if (q.event_id === id) {
            db.update('quizzes', (item) => item.id === q.id, { event_name: updates.title });
          }
        });
      }

      AuditService.log(req.user.id, 'UPDATE_EVENT', 'EVENT', id, updates);

      return success(res, updatedEvent, 'Event updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const events = db.get('events') || [];
      const event = events.find((e) => e.id === id);

      db.remove('events', (e) => e.id === id);
      db.remove('rounds', (r) => r.event_id === id);
      db.remove('quizzes', (q) => q.event_id === id);

      AuditService.log(req.user.id, 'DELETE_EVENT', 'EVENT', id, {
        title: event ? event.title : id
      });

      return success(res, {}, 'Event and linked configuration removed successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AdminController;
