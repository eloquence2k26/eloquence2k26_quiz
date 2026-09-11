const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase');
const logger = require('../utils/logger');

// Known column definitions for sanitizing payloads before sending to Supabase
const TABLE_COLUMNS = {
  users: ['id', 'email', 'password_hash', 'role', 'is_active', 'created_at', 'updated_at'],
  profiles: ['id', 'full_name', 'mobile', 'avatar_url', 'created_at', 'updated_at'],
  participants: [
    'id', 'participant_id', 'full_name', 'email', 'mobile', 'college',
    'department', 'year', 'event', 'registration_number', 'photo_url',
    'round_1_selected', 'round_2_selected', 'is_disabled', 'created_at', 'updated_at'
  ],
  admins: ['id', 'full_name', 'email', 'admin_level', 'created_at'],
  events: ['id', 'title', 'code', 'description', 'is_active', 'created_at', 'updated_at'],
  rounds: [
    'id', 'event_id', 'round_number', 'round_name', 'description',
    'is_active', 'is_published', 'created_at', 'updated_at'
  ],
  quizzes: [
    'id', 'event_id', 'round_id', 'title', 'description', 'event_name',
    'round_number', 'total_questions', 'duration_minutes', 'start_date',
    'start_time', 'end_date', 'end_time', 'start_datetime', 'end_datetime',
    'max_marks', 'pass_percentage', 'negative_marking', 'negative_mark_value',
    'max_attempts', 'status', 'desktop_only', 'fullscreen_required',
    'max_violations', 'shuffle_questions', 'shuffle_options',
    'show_detailed_results', 'published_participant_ids', 'created_by',
    'created_at', 'updated_at'
  ],
  questions: [
    'id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'marks', 'negative_marks', 'explanation', 'category',
    'difficulty', 'event_name', 'round_number', 'rounds', 'image_url',
    'created_by', 'created_at', 'updated_at'
  ],
  quiz_questions: ['id', 'quiz_id', 'question_id', 'display_order', 'created_at'],
  quiz_assignments: ['id', 'quiz_id', 'participant_id', 'assigned_by', 'assigned_at', 'status'],
  exam_attempts: [
    'id', 'quiz_id', 'participant_id', 'attempt_number', 'session_id',
    'status', 'started_at', 'expires_at', 'submitted_at', 'termination_reason',
    'violation_count', 'ip_address', 'user_agent', 'created_at', 'updated_at'
  ],
  question_orders: ['id', 'attempt_id', 'question_id', 'question_order', 'options_order', 'created_at'],
  attempt_answers: [
    'id', 'attempt_id', 'question_id', 'selected_option', 'is_marked_for_review',
    'is_correct', 'marks_awarded', 'answered_at', 'updated_at'
  ],
  results: [
    'id', 'attempt_id', 'quiz_id', 'participant_id', 'total_questions',
    'attempted_questions', 'correct_answers', 'wrong_answers', 'unanswered_questions',
    'positive_marks', 'negative_marks', 'final_score', 'percentage', 'rank',
    'is_passed', 'time_taken_seconds', 'status', 'published_at', 'created_at', 'updated_at'
  ],
  round_selections: [
    'id', 'event_id', 'round_number', 'participant_id', 'score', 'rank',
    'selected', 'selected_by', 'published_at', 'created_at'
  ],
  security_violations: [
    'id', 'attempt_id', 'participant_id', 'quiz_id', 'violation_type',
    'description', 'severity', 'timestamp', 'ip_address', 'user_agent', 'metadata'
  ],
  exam_sessions: [
    'id', 'participant_id', 'quiz_id', 'session_id', 'is_active',
    'last_heartbeat', 'ip_address', 'user_agent', 'created_at', 'updated_at'
  ],
  announcements: [
    'id', 'title', 'message', 'target_type', 'quiz_id', 'is_active',
    'created_by', 'created_at'
  ],
  audit_logs: ['id', 'admin_id', 'action', 'entity_type', 'entity_id', 'timestamp', 'metadata'],
  roles: ['id', 'name', 'title', 'description', 'permissions', 'badge', 'color', 'created_at', 'updated_at'],
  system_settings: ['key', 'value', 'updated_at']
};

// Table Aliases map for singular/plural/alternative table names
const TABLE_ALIASES = {
  exam_attempt: 'exam_attempts',
  exam_attempts: 'exam_attempts',
  exam_session: 'exam_sessions',
  exam_sessions: 'exam_sessions',
  question_order: 'question_orders',
  question_orders: 'question_orders',
  question: 'questions',
  questions: 'questions',
  quiz_question: 'quiz_questions',
  quiz_questions: 'quiz_questions',
  quiz_access: 'quiz_assignments',
  quiz_assignment: 'quiz_assignments',
  quiz_assignments: 'quiz_assignments',
  quiz_answer: 'attempt_answers',
  quiz_answers: 'attempt_answers',
  attempt_answer: 'attempt_answers',
  attempt_answers: 'attempt_answers',
  result: 'results',
  results: 'results',
  round_selection: 'round_selections',
  round_selections: 'round_selections',
  security_violation: 'security_violations',
  security_violations: 'security_violations',
  quiz: 'quizzes',
  quizzes: 'quizzes',
  round: 'rounds',
  rounds: 'rounds',
  event: 'events',
  events: 'events',
  participant: 'participants',
  participants: 'participants',
  user: 'users',
  users: 'users',
  profile: 'profiles',
  profiles: 'profiles',
  admin: 'admins',
  admins: 'admins',
  announcement: 'announcements',
  announcements: 'announcements',
  audit_log: 'audit_logs',
  audit_logs: 'audit_logs',
  role: 'roles',
  roles: 'roles'
};

const TABLES = Object.keys(TABLE_COLUMNS).filter((t) => t !== 'system_settings');

const UUID_FIELDS = new Set([
  'id', 'created_by', 'quiz_id', 'question_id', 'participant_id',
  'attempt_id', 'event_id', 'round_id', 'admin_id', 'assigned_by'
]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class DBStore {
  constructor() {
    this.client = supabase;
    this.data = {
      users: [],
      profiles: [],
      participants: [],
      admins: [],
      roles: [],
      events: [],
      rounds: [],
      quizzes: [],
      questions: [],
      quiz_questions: [],
      quiz_assignments: [],
      exam_attempts: [],
      question_orders: [],
      attempt_answers: [],
      results: [],
      round_selections: [],
      security_violations: [],
      exam_sessions: [],
      announcements: [],
      audit_logs: [],
      system_settings: {
        max_violations: 3,
        fullscreen_required: true,
        clipboard_monitoring: true,
        tab_switch_monitoring: true,
        window_blur_monitoring: true,
        desktop_only: false,
        auto_submit_on_expiry: true,
        show_detailed_results: true
      }
    };
    this.isInitialized = false;
    this.init();
  }

  /**
   * Resolve any table name or alias to canonical table name
   */
  resolveTable(name) {
    if (!name) return name;
    const clean = String(name).trim().toLowerCase();
    return TABLE_ALIASES[clean] || clean;
  }

  /**
   * Sanitize an item object to only valid PostgreSQL table columns and valid datatypes
   */
  sanitize(collection, item) {
    if (!item || typeof item !== 'object') return item;
    const tbl = this.resolveTable(collection);
    const allowed = TABLE_COLUMNS[tbl];
    if (!allowed) {
      return Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
    }
    const clean = {};
    for (const key of allowed) {
      if (item[key] !== undefined) {
        let val = item[key];
        // Handle UUID fields
        if (UUID_FIELDS.has(key) && tbl !== 'roles') {
          if (typeof val === 'string' && !UUID_REGEX.test(val.trim())) {
            // Intelligent UUID resolver for foreign keys
            if (key === 'participant_id') {
              const p = (this.data.participants || []).find(
                (part) => part.participant_id === val || part.id === val || part.email === val || part.registration_number === val
              );
              if (p && UUID_REGEX.test(String(p.id).trim())) {
                val = p.id;
              } else {
                const u = (this.data.users || []).find(
                  (user) => user.email === val || user.id === val
                );
                if (u && UUID_REGEX.test(String(u.id).trim())) {
                  val = u.id;
                }
              }
            } else if (key === 'quiz_id') {
              const q = (this.data.quizzes || []).find((quiz) => quiz.id === val || quiz.title === val);
              if (q && UUID_REGEX.test(String(q.id).trim())) {
                val = q.id;
              }
            } else if (key === 'id') {
              val = uuidv4();
            }
          }
        }
        clean[key] = val;
      }
    }
    return clean;
  }

  /**
   * Initialize and hydrate all tables from Supabase PostgreSQL database
   */
  async init() {
    try {
      logger.info('Connecting to Supabase Database...');

      // Fetch all core tables in parallel
      const loadPromises = TABLES.map(async (table) => {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            logger.warn(`[DB] Supabase table "${table}" notice: ${error.message}`);
            return { table, data: [] };
          }
          return { table, data: data || [] };
        } catch (err) {
          logger.warn(`[DB] Failed to load table "${table}": ${err.message}`);
          return { table, data: [] };
        }
      });

      const results = await Promise.all(loadPromises);
      for (const res of results) {
        this.data[res.table] = res.data;
      }

      // Fetch system settings
      try {
        const { data: settingsRows, error: settingsErr } = await supabase
          .from('system_settings')
          .select('*');

        if (!settingsErr && Array.isArray(settingsRows)) {
          for (const row of settingsRows) {
            if (row.key === 'security_config' && typeof row.value === 'object') {
              this.data.system_settings = { ...this.data.system_settings, ...row.value };
            } else if (row.key) {
              this.data.system_settings[row.key] = row.value;
            }
          }
        }
      } catch (settingsEx) {
        logger.warn(`[DB] Notice loading system settings: ${settingsEx.message}`);
      }

      this.isInitialized = true;
      const totalRecords = TABLES.reduce((sum, t) => sum + (this.data[t] ? this.data[t].length : 0), 0);
      logger.info(`[DB] Connected successfully to Supabase. Loaded ${totalRecords} records across ${TABLES.length} tables.`);

      // Ensure default roles exist in roles table
      if (!this.data.roles || this.data.roles.length === 0) {
        this.data.roles = [
          {
            id: 'role-super-admin',
            name: 'SUPER_ADMIN',
            title: 'Super Administrator / Director',
            description: 'Full unconstrained system authority over examinations, questions, scholars, proctoring, and server credentials.',
            permissions: ['All Privileges', 'User & Role Management', 'Proctor Overrides', 'Full DB Sync', 'Attempt Restarts'],
            badge: 'Level 1 - Core',
            color: 'from-amber-600 to-orange-600',
            created_at: new Date().toISOString()
          },
          {
            id: 'role-admin',
            name: 'ADMIN',
            title: 'Symposium Admin',
            description: 'Manages quiz events, question pools, participant registrations, schedule windows, and leaderboards.',
            permissions: ['Event & Quiz Config', 'Question Bank Authoring', 'Candidate Registration', 'Live Proctoring', 'Results Export'],
            badge: 'Level 2 - General',
            color: 'from-brand-600 to-indigo-600',
            created_at: new Date().toISOString()
          },
          {
            id: 'role-coordinator',
            name: 'COORDINATOR',
            title: 'Event Coordinator',
            description: 'Department coordinator responsible for event-specific quiz questions and preliminary grading.',
            permissions: ['Question Authoring', 'Event Roster', 'Live Exam Monitoring', 'Candidate Verification'],
            badge: 'Level 3 - Event',
            color: 'from-blue-600 to-cyan-600',
            created_at: new Date().toISOString()
          },
          {
            id: 'role-proctor',
            name: 'PROCTOR',
            title: 'Exam Proctor / Invigilator',
            description: 'Real-time arena monitor tracking security violations, browser focus loss, and mobile gestures.',
            permissions: ['Live Exam Monitoring', 'Violations Feed', 'Violation Warnings', 'Manual Termination'],
            badge: 'Level 4 - Proctor',
            color: 'from-emerald-600 to-teal-600',
            created_at: new Date().toISOString()
          },
          {
            id: 'role-volunteer',
            name: 'VOLUNTEER',
            title: 'Desk Volunteer',
            description: 'Registration desk staff assisting with participant onboarding, credential lookup, and lab seat allocation.',
            permissions: ['Candidate Lookup', 'Credential Quick-Fill', 'Registration Verification'],
            badge: 'Level 5 - Support',
            color: 'from-purple-600 to-pink-600',
            created_at: new Date().toISOString()
          }
        ];
      }

      // Ensure root administrator is always active
      const rootAdmin = (this.data.users || []).find((u) => u.email && u.email.toLowerCase() === 'admin@eloquence.com');
      if (rootAdmin) {
        rootAdmin.is_active = true;
      }

      // Auto-synchronize any PARTICIPANT users into participants table and Supabase
      const participantsList = this.data.participants || [];
      const usersList = this.data.users || [];
      const profilesList = this.data.profiles || [];
      const pUserIds = new Set(participantsList.map((p) => p.id));
      const pEmails = new Set(participantsList.map((p) => (p.email || '').toLowerCase()));

      const missingParticipants = usersList.filter(
        (u) => u.role === 'PARTICIPANT' && !pUserIds.has(u.id) && !pEmails.has((u.email || '').toLowerCase())
      );

      for (let idx = 0; idx < missingParticipants.length; idx++) {
        const u = missingParticipants[idx];
        const profile = profilesList.find((p) => p.id === u.id) || {};
        const count = participantsList.length + idx + 1;
        const pId = `ELQ-2026-${String(count).padStart(3, '0')}`;
        const regNo = `REG-2026-${String(count).padStart(3, '0')}`;

        const newP = {
          id: u.id,
          participant_id: pId,
          full_name: profile.full_name || (u.email || '').split('@')[0],
          email: u.email,
          mobile: profile.mobile || '',
          college: 'Engineering College',
          department: 'Computer Science & Engineering',
          year: '3rd Year',
          event: 'Technical Quiz',
          registration_number: regNo,
          round_1_selected: false,
          round_2_selected: false,
          is_disabled: !u.is_active,
          created_at: u.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        this.data.participants.push(newP);

        // Persist to Supabase so foreign keys in quiz_assignments, exam_attempts work
        try {
          const cleanP = this.sanitize('participants', newP);
          await supabase.from('participants').upsert([cleanP]);
        } catch (syncErr) {
          logger.warn(`[DB] Auto-sync participant error: ${syncErr.message}`);
        }
      }

      // Start automatic live background synchronization timer (every 60s)
      if (!this._bgSyncTimer) {
        this._bgSyncTimer = setInterval(() => {
          this.init().catch((e) => logger.warn(`[DB] Background live sync notice: ${e.message}`));
        }, 60000);
      }
    } catch (err) {
      logger.error(`[DB] Critical error initializing Supabase connection: ${err.message}`);
    }
  }

  /**
   * Reload single table or all tables from Supabase
   */
  /**
   * Reload single table or all tables from Supabase
   */
  async refresh(collection) {
    try {
      if (collection && collection !== 'system_settings') {
        const tbl = this.resolveTable(collection);
        const { data, error } = await supabase.from(tbl).select('*');
        if (!error && data) {
          this.data[tbl] = data;
        }
        return this.data[tbl];
      }
      return this.init();
    } catch (err) {
      logger.warn(`[DB] Refresh failed for ${collection}: ${err.message}`);
    }
  }

  get(collection) {
    const tbl = this.resolveTable(collection);
    if (tbl === 'system_settings') {
      return this.data.system_settings || {};
    }
    return this.data[tbl] || [];
  }

  set(collection, items) {
    const tbl = this.resolveTable(collection);
    if (tbl === 'system_settings') {
      this.data.system_settings = items;
      // Persist system_settings to Supabase
      (async () => {
        try {
          await supabase.from('system_settings').upsert({
            key: 'security_config',
            value: items,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          logger.warn(`[DB] Error persisting system_settings to Supabase: ${err.message}`);
        }
      })();
      return this.data.system_settings;
    }

    this.data[tbl] = items;
    return this.data[tbl];
  }

  find(collection, predicate) {
    const tbl = this.resolveTable(collection);
    const list = this.get(tbl);
    return list.find(predicate);
  }

  filter(collection, predicate) {
    const tbl = this.resolveTable(collection);
    const list = this.get(tbl);
    return list.filter(predicate);
  }

  /**
   * Insert record into memory and live Supabase table
   */
  insert(collection, item) {
    const tbl = this.resolveTable(collection);
    if (!item.id) item.id = uuidv4();
    if (!item.created_at) item.created_at = new Date().toISOString();
    if (!this.data[tbl]) this.data[tbl] = [];

    // Push to cache
    this.data[tbl].push(item);

    // Save directly to Supabase DB table
    const cleanItem = this.sanitize(tbl, item);
    (async () => {
      try {
        const { error } = await supabase.from(tbl).upsert([cleanItem]);
        if (error) {
          logger.error(`[DB Live] Supabase upsert error on "${tbl}": ${error.message}`);
        } else {
          logger.info(`[DB Live] Stored/updated record in Supabase table "${tbl}" (${item.id})`);
        }
      } catch (err) {
        logger.error(`[DB Live] Supabase insert exception on "${tbl}": ${err.message}`);
      }
    })();

    return item;
  }

  /**
   * Update record in memory and live Supabase table
   */
  update(collection, predicate, updates) {
    const tbl = this.resolveTable(collection);
    const list = this.get(tbl);
    const index = list.findIndex(predicate);
    if (index === -1) return null;

    const existing = list[index];
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    list[index] = updated;

    // Save directly to Supabase DB table
    if (updated.id) {
      const cleanUpdates = this.sanitize(tbl, updated);
      const { id, ...fieldsToUpdate } = cleanUpdates;
      (async () => {
        try {
          const { error } = await supabase
            .from(tbl)
            .update(fieldsToUpdate)
            .eq('id', updated.id);

          if (error) {
            logger.error(`[DB Live] Supabase update error on "${tbl}" ID ${updated.id}: ${error.message}`);
          } else {
            logger.info(`[DB Live] Updated record in Supabase table "${tbl}" (${updated.id})`);
          }
        } catch (err) {
          logger.error(`[DB Live] Supabase update exception on "${tbl}" ID ${updated.id}: ${err.message}`);
        }
      })();
    }

    return updated;
  }

  /**
   * Remove record in memory and live Supabase table
   */
  remove(collection, predicate) {
    const tbl = this.resolveTable(collection);
    const list = this.get(tbl);
    const itemsToDelete = list.filter(predicate);
    const initialLen = list.length;

    this.data[tbl] = list.filter((item) => !predicate(item));
    const wasRemoved = this.data[tbl].length !== initialLen;

    // Delete directly from Supabase DB table
    if (itemsToDelete.length > 0) {
      const idsToDelete = itemsToDelete.map((item) => item.id).filter(Boolean);
      if (idsToDelete.length > 0) {
        (async () => {
          try {
            const { error } = await supabase
              .from(tbl)
              .delete()
              .in('id', idsToDelete);

            if (error) {
              logger.error(`[DB Live] Supabase delete error on "${tbl}": ${error.message}`);
            } else {
              logger.info(`[DB Live] Deleted ${idsToDelete.length} records from Supabase table "${tbl}"`);
            }
          } catch (err) {
            logger.error(`[DB Live] Supabase delete exception on "${tbl}": ${err.message}`);
          }
        })();
      }
    }

    return wasRemoved;
  }
}

const db = new DBStore();
module.exports = db;
