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

      // If events exist in the database, use events table as the source of truth
      if (events.length > 0) {
        events.forEach((e) => {
          if (e.title && e.title.trim()) {
            const key = e.title.trim().toLowerCase();
            if (!eventMap.has(key)) {
              eventMap.set(key, {
                id: e.id,
                title: e.title.trim(),
                code: e.code || `EVT-${e.title.trim().slice(0, 4).toUpperCase()}`,
                description: e.description || '',
                is_active: e.is_active !== false,
                created_at: e.created_at || new Date().toISOString()
              });
            }
          }
        });
      } else {
        // Only if events table is completely empty, derive distinct events from existing quizzes
        quizzes.forEach((q) => {
          const title = q.event_name || q.title;
          if (title && title.trim()) {
            const key = title.trim().toLowerCase();
            if (!eventMap.has(key)) {
              eventMap.set(key, {
                id: q.event_id || q.id,
                title: title.trim(),
                code: q.event_code || 'ELQ26',
                description: q.description || '',
                is_active: true,
                created_at: q.created_at || new Date().toISOString()
              });
            }
          }
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

  /**
   * Force Sync & Re-fetch All PostgreSQL DB Tables from Supabase
   */
  static async syncDatabase(req, res) {
    try {
      await db.init();

      const tableStats = {};
      const allTables = [
        'users', 'profiles', 'participants', 'admins', 'events', 'rounds',
        'quizzes', 'questions', 'quiz_questions', 'quiz_assignments',
        'exam_attempts', 'question_orders', 'attempt_answers', 'results',
        'round_selections', 'security_violations', 'exam_sessions',
        'announcements', 'audit_logs'
      ];

      allTables.forEach((tableName) => {
        tableStats[tableName] = (db.get(tableName) || []).length;
      });

      const totalRecords = Object.values(tableStats).reduce((sum, count) => sum + count, 0);

      AuditService.log(req.user ? req.user.id : null, 'SYNC_DATABASE_TABLES', 'DATABASE', null, {
        total_records: totalRecords,
        table_stats: tableStats
      });

      return success(res, {
        total_records: totalRecords,
        tables_synced: allTables.length,
        table_stats: tableStats,
        timestamp: new Date().toISOString()
      }, `All ${allTables.length} Supabase database tables successfully synchronized (${totalRecords} live records).`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get all Users (Admins, Staff, Coordinators, Proctors, Volunteers & Participants)
   */
  static async getUsers(req, res) {
    try {
      const users = db.get('users') || [];
      const profiles = db.get('profiles') || [];
      const admins = db.get('admins') || [];
      const participants = db.get('participants') || [];

      const userIds = new Set();
      const allUsers = users.map((u) => {
        userIds.add(u.id);
        const profile = profiles.find((p) => p.id === u.id) || {};
        const admin = admins.find((a) => a.id === u.id) || {};
        const participant = participants.find((p) => p.id === u.id || (p.email && p.email.toLowerCase() === u.email.toLowerCase())) || {};

        return {
          id: u.id,
          email: u.email,
          username: (u.email || '').split('@')[0],
          role: u.role || (admin.admin_level ? 'ADMIN' : (participant.id ? 'PARTICIPANT' : 'ADMIN')),
          admin_level: admin.admin_level || (u.role !== 'PARTICIPANT' ? u.role : null),
          participant_id: participant.participant_id || null,
          registration_number: participant.registration_number || null,
          event: participant.event || null,
          college: participant.college || null,
          department: participant.department || null,
          full_name: profile.full_name || admin.full_name || participant.full_name || (u.email || '').split('@')[0],
          mobile: profile.mobile || participant.mobile || '',
          is_active: u.is_active !== false && !participant.is_disabled,
          created_at: u.created_at || participant.created_at || new Date().toISOString()
        };
      });

      // Ensure any participants recorded directly in participants table are also included in users view
      participants.forEach((p) => {
        if (!userIds.has(p.id)) {
          userIds.add(p.id);
          allUsers.push({
            id: p.id,
            email: p.email,
            username: (p.email || p.participant_id || 'user').split('@')[0],
            role: 'PARTICIPANT',
            admin_level: null,
            participant_id: p.participant_id || null,
            registration_number: p.registration_number || null,
            event: p.event || null,
            college: p.college || null,
            department: p.department || null,
            full_name: p.full_name || p.email?.split('@')[0] || 'Participant',
            mobile: p.mobile || '',
            is_active: !p.is_disabled,
            created_at: p.created_at || new Date().toISOString()
          });
        }
      });

      return success(res, allUsers);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create a new Admin / Staff User
   */
  static async createUser(req, res) {
    try {
      const { email, password, full_name, role, admin_level, mobile } = req.body;

      if (!email || !email.trim()) {
        return error(res, 'Email / Username is required', 400);
      }
      if (!password || !password.trim()) {
        return error(res, 'Password is required', 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.find('users', (u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return error(res, `A user with email "${cleanEmail}" already exists.`, 409);
      }

      const selectedRole = (admin_level || role || 'ADMIN').toUpperCase();
      const bcrypt = require('bcryptjs');
      const password_hash = await bcrypt.hash(password.trim(), 10);

      const newUser = db.insert('users', {
        email: cleanEmail,
        password_hash,
        role: selectedRole,
        is_active: true
      });

      db.insert('profiles', {
        id: newUser.id,
        full_name: full_name ? full_name.trim() : cleanEmail.split('@')[0],
        mobile: mobile ? mobile.trim() : ''
      });

      db.insert('admins', {
        id: newUser.id,
        full_name: full_name ? full_name.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        admin_level: selectedRole
      });

      AuditService.log(req.user ? req.user.id : null, 'CREATE_ADMIN_USER', 'USER', newUser.id, {
        email: cleanEmail,
        role: selectedRole,
        admin_level: selectedRole
      });

      return success(res, {
        id: newUser.id,
        email: newUser.email,
        role: selectedRole,
        admin_level: selectedRole,
        full_name: full_name || cleanEmail.split('@')[0],
        is_active: true
      }, 'Admin/Staff user created successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update an Admin / Staff User
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, password, full_name, role, admin_level, is_active, mobile } = req.body;

      const user = db.find('users', (u) => u.id === id);
      if (!user) return error(res, 'User not found', 404);

      const selectedRole = (admin_level || role || user.role || 'ADMIN').toUpperCase();
      const updates = {
        role: selectedRole
      };

      if (email && email.trim()) updates.email = email.trim().toLowerCase();
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      if (password && password.trim()) {
        const bcrypt = require('bcryptjs');
        updates.password_hash = await bcrypt.hash(password.trim(), 10);
      }

      db.update('users', (u) => u.id === id, updates);

      // Update Profile
      const existingProfile = db.find('profiles', (p) => p.id === id);
      const profileUpdates = {
        ...(full_name !== undefined && { full_name: full_name.trim() }),
        ...(mobile !== undefined && { mobile: mobile ? mobile.trim() : '' })
      };
      if (existingProfile) {
        db.update('profiles', (p) => p.id === id, profileUpdates);
      } else {
        db.insert('profiles', { id, full_name: full_name || user.email.split('@')[0], mobile: mobile || '' });
      }

      // Update Admins table
      const existingAdmin = db.find('admins', (a) => a.id === id);
      const adminUpdates = {
        admin_level: selectedRole,
        ...(full_name !== undefined && { full_name: full_name.trim() }),
        ...(updates.email && { email: updates.email })
      };
      if (existingAdmin) {
        db.update('admins', (a) => a.id === id, adminUpdates);
      } else {
        db.insert('admins', {
          id,
          full_name: full_name || user.email.split('@')[0],
          email: updates.email || user.email,
          admin_level: selectedRole
        });
      }

      AuditService.log(req.user ? req.user.id : null, 'UPDATE_ADMIN_USER', 'USER', id, {
        email: updates.email || user.email,
        role: selectedRole,
        admin_level: selectedRole
      });

      return success(res, {
        id,
        email: updates.email || user.email,
        role: selectedRole,
        admin_level: selectedRole,
        is_active: updates.is_active !== undefined ? updates.is_active : user.is_active
      }, 'User updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete an Admin / Staff User
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = db.find('users', (u) => u.id === id);
      if (!user) return error(res, 'User not found', 404);

      if (user.email.toLowerCase() === 'admin@eloquence.com') {
        return error(res, 'Root administrator account cannot be deleted.', 403);
      }

      db.remove('users', (u) => u.id === id);
      db.remove('profiles', (p) => p.id === id);
      db.remove('admins', (a) => a.id === id);

      AuditService.log(req.user ? req.user.id : null, 'DELETE_ADMIN_USER', 'USER', id, { email: user.email });

      return success(res, {}, 'User account removed successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Roles & Permissions Matrix
   */
  static async getRoles(req, res) {
    try {
      const roles = [
        {
          id: 'role-super-admin',
          name: 'SUPER_ADMIN',
          title: 'Super Administrator / Director',
          description: 'Full unconstrained system authority over examinations, questions, scholars, proctoring, and server credentials.',
          users_count: (db.get('admins') || []).filter((a) => a.admin_level === 'SUPER_ADMIN').length || 1,
          permissions: [
            'All Privileges',
            'User & Role Management',
            'Proctor Zero-Tolerance Overrides',
            'Full Database Synchronization',
            'Exam Attempt Restarts',
            'Result Publishing & Cutoffs'
          ],
          color: 'from-amber-600 to-orange-600',
          badge: 'Level 1 - Core'
        },
        {
          id: 'role-admin',
          name: 'ADMIN',
          title: 'Symposium Admin',
          description: 'Manages quiz events, question pools, participant registrations, schedule windows, and leaderboards.',
          users_count: (db.get('users') || []).filter((u) => u.role === 'ADMIN').length || 1,
          permissions: [
            'Event & Quiz Configuration',
            'Question Bank Creation',
            'Candidate Registration & Import',
            'Live Proctoring & Monitoring',
            'Results Export & Analytics'
          ],
          color: 'from-brand-600 to-indigo-600',
          badge: 'Level 2 - General'
        },
        {
          id: 'role-coordinator',
          name: 'COORDINATOR',
          title: 'Event Coordinator',
          description: 'Department coordinator responsible for event-specific quiz questions, candidate verification, and preliminary grading.',
          users_count: 0,
          permissions: [
            'Question Bank Authoring',
            'Event Roster Viewing',
            'Live Exam Monitoring',
            'Candidate Verification'
          ],
          color: 'from-blue-600 to-cyan-600',
          badge: 'Level 3 - Event'
        },
        {
          id: 'role-proctor',
          name: 'PROCTOR',
          title: 'Exam Proctor / Invigilator',
          description: 'Real-time arena monitor tracking security violations, browser focus loss, and mobile gestures.',
          users_count: 0,
          permissions: [
            'Live Examination Monitoring',
            'Security Violations Feed',
            'Violation Warning Issuance',
            'Attempt Manual Termination'
          ],
          color: 'from-emerald-600 to-teal-600',
          badge: 'Level 4 - Proctor'
        },
        {
          id: 'role-volunteer',
          name: 'VOLUNTEER',
          title: 'Desk Volunteer',
          description: 'Registration desk staff assisting with participant onboarding, credential lookup, and lab seat allocation.',
          users_count: 0,
          permissions: [
            'Candidate Lookup',
            'Credential Quick-Fill',
            'Registration Verification'
          ],
          color: 'from-purple-600 to-pink-600',
          badge: 'Level 5 - Support'
        }
      ];

      return success(res, roles);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AdminController;
