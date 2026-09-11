const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');
const DocumentParserService = require('../services/documentParserService');

class ParticipantController {
  /**
   * Get all participants (with filters for college, event, round selection, disabled)
   */
  static async getAllParticipants(req, res) {
    try {
      const { search, college, round_1_selected, is_disabled } = req.query;
      let participants = db.get('participants') || [];
      const users = db.get('users') || [];
      const profiles = db.get('profiles') || [];

      // Also ensure any users registered with PARTICIPANT role appear in participants directory
      const participantIds = new Set(participants.map((p) => p.id));
      const missingUsers = users.filter((u) => u.role === 'PARTICIPANT' && !participantIds.has(u.id));

      if (missingUsers.length > 0) {
        missingUsers.forEach((u, idx) => {
          const profile = profiles.find((p) => p.id === u.id) || {};
          const count = participants.length + idx + 1;
          const pId = `ELQ-2026-${String(count).padStart(3, '0')}`;
          const regNo = `REG-2026-${String(count).padStart(3, '0')}`;
          participants.push({
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
            is_disabled: !u.is_active
          });
        });
      }

      if (college) {
        participants = participants.filter((p) => (p.college || '').toLowerCase().includes(college.toLowerCase()));
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
          (p.full_name || '').toLowerCase().includes(term) ||
          (p.participant_id || '').toLowerCase().includes(term) ||
          (p.registration_number || '').toLowerCase().includes(term) ||
          (p.email || '').toLowerCase().includes(term) ||
          (p.mobile || '').toLowerCase().includes(term) ||
          (p.college || '').toLowerCase().includes(term)
        );
      }

      // Enrich with assigned quizzes count and assigned quiz IDs/titles/event names with Round number
      const assignments = db.get('quiz_assignments') || [];
      const quizzes = db.get('quizzes') || [];
      const enriched = participants.map((p) => {
        const matchedUser = users.find((u) => u.id === p.id || (p.email && u.email?.toLowerCase() === p.email.toLowerCase()));
        const userIds = new Set([
          p.id,
          p.participant_id,
          p.email ? p.email.toLowerCase() : null,
          p.registration_number,
          matchedUser ? matchedUser.id : null,
          matchedUser ? matchedUser.email?.toLowerCase() : null
        ].filter(Boolean));

        const pAssignments = assignments.filter((a) => userIds.has(a.participant_id) || (a.participant_id && userIds.has(a.participant_id.toLowerCase())));
        
        const pQuizIds = Array.from(new Set([
          ...pAssignments.map((a) => a.quiz_id),
          ...(Array.isArray(p.assigned_quiz_ids) ? p.assigned_quiz_ids : [])
        ]));

        const pQuizzes = quizzes.filter((q) => pQuizIds.includes(q.id));
        const assignedQuizTitles = pQuizzes.map((q) => `${q.title || q.event_name} (Round ${q.round_number || 1})`).filter(Boolean);
        const assignedEventNames = pQuizzes.map((q) => q.event_name || q.title).filter(Boolean);
        const assignedQuizDetails = pQuizzes.map((q) => ({
          id: q.id,
          title: q.title,
          round_number: q.round_number || 1,
          event_name: q.event_name || q.title,
          status: q.status
        }));

        return {
          ...p,
          assigned_quizzes_count: pQuizIds.length,
          assigned_quiz_ids: pQuizIds,
          assigned_quiz_titles: assignedQuizTitles,
          assigned_event_names: assignedEventNames,
          assigned_quiz_details: assignedQuizDetails
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
   * Update participant details
   */
  static async updateParticipant(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        email,
        mobile,
        college,
        department,
        year,
        registration_number,
        event,
        round_1_selected,
        round_2_selected,
        is_disabled,
        password
      } = req.body;

      const participant = db.find('participants', (p) => p.id === id);
      if (!participant) return error(res, 'Participant not found', 404);

      let cleanEmail = participant.email;
      if (email && email.trim()) {
        cleanEmail = email.trim().toLowerCase();
        if (cleanEmail !== participant.email.toLowerCase()) {
          const existingUser = db.find('users', (u) => u.email.toLowerCase() === cleanEmail && u.id !== id);
          if (existingUser) {
            return error(res, `A user with email "${cleanEmail}" already exists.`, 409);
          }
        }
      }

      let cleanMobile = participant.mobile;
      if (mobile !== undefined && mobile !== null) {
        cleanMobile = mobile.trim();
      }

      // Update users table
      const userUpdates = {};
      if (email && email.trim()) {
        userUpdates.email = cleanEmail;
      }
      if (is_disabled !== undefined) {
        userUpdates.is_active = !Boolean(is_disabled);
      }
      if (password && password.trim()) {
        userUpdates.password_hash = await bcrypt.hash(password.trim(), 10);
      }
      if (Object.keys(userUpdates).length > 0) {
        db.update('users', (u) => u.id === id, userUpdates);
      }

      // Update profiles table
      const profileUpdates = {};
      if (full_name !== undefined) profileUpdates.full_name = full_name.trim();
      if (mobile !== undefined) profileUpdates.mobile = cleanMobile;
      if (Object.keys(profileUpdates).length > 0) {
        db.update('profiles', (p) => p.id === id, profileUpdates);
      }

      // Update participants table
      const participantUpdates = {};
      if (full_name !== undefined) participantUpdates.full_name = full_name.trim();
      if (email !== undefined) participantUpdates.email = cleanEmail;
      if (mobile !== undefined) participantUpdates.mobile = cleanMobile;
      if (college !== undefined) participantUpdates.college = college.trim();
      if (department !== undefined) participantUpdates.department = department.trim();
      if (year !== undefined) participantUpdates.year = year.trim();
      if (registration_number !== undefined) participantUpdates.registration_number = registration_number.trim();
      if (event !== undefined) participantUpdates.event = event.trim();
      if (round_1_selected !== undefined) participantUpdates.round_1_selected = Boolean(round_1_selected);
      if (round_2_selected !== undefined) participantUpdates.round_2_selected = Boolean(round_2_selected);
      if (is_disabled !== undefined) participantUpdates.is_disabled = Boolean(is_disabled);

      const updatedParticipant = db.update('participants', (p) => p.id === id, participantUpdates);

      AuditService.log(req.user.id, 'UPDATE_PARTICIPANT', 'PARTICIPANT', id, {
        participant_id: participant.participant_id,
        updates: Object.keys(participantUpdates)
      });

      return success(res, updatedParticipant, 'Participant updated successfully');
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

      // Clean up attempt-related child records
      const attempts = db.filter('exam_attempts', (ea) => ea.participant_id === id);
      const attemptIds = new Set(attempts.map((a) => a.id));

      if (attemptIds.size > 0) {
        db.remove('attempt_answers', (aa) => attemptIds.has(aa.attempt_id));
        db.remove('question_orders', (qo) => attemptIds.has(qo.attempt_id));
      }

      db.remove('participants', (p) => p.id === id);
      db.remove('users', (u) => u.id === id);
      db.remove('profiles', (p) => p.id === id);
      db.remove('quiz_assignments', (qa) => qa.participant_id === id);
      db.remove('exam_attempts', (ea) => ea.participant_id === id);
      db.remove('results', (r) => r.participant_id === id);
      db.remove('security_violations', (sv) => sv.participant_id === id);
      db.remove('exam_sessions', (es) => es.participant_id === id);
      db.remove('round_selections', (rs) => rs.participant_id === id);

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
   * Create single participant by admin
   */
  static async createParticipant(req, res) {
    try {
      const {
        full_name,
        mobile,
        email,
        college = 'Engineering College',
        department = 'Computer Science & Engineering',
        year = '3rd Year',
        password,
        registration_number,
        auto_password = true,
        assign_round1 = true
      } = req.body;

      if (!full_name || !full_name.trim()) {
        return error(res, 'Full Name is required', 400);
      }

      if (!mobile || !mobile.trim()) {
        return error(res, 'Phone / Mobile number is required', 400);
      }

      const cleanMobile = mobile.trim();
      let mobileDigits = cleanMobile.replace(/\D/g, '');
      if (mobileDigits.length === 12 && mobileDigits.startsWith('91')) {
        mobileDigits = mobileDigits.slice(2);
      } else if (mobileDigits.length === 11 && mobileDigits.startsWith('0')) {
        mobileDigits = mobileDigits.slice(1);
      }

      // Determine password: if custom password provided, use it; otherwise use first 4 digits of phone
      let finalPassword = password && password.trim() ? password.trim() : '';
      if (!finalPassword) {
        finalPassword = mobileDigits.length >= 4 ? mobileDigits.slice(0, 4) : (mobileDigits || '1234');
      }

      // Determine email: if not provided, auto-generate standard format
      let finalEmail = email && email.trim() ? email.trim().toLowerCase() : '';
      if (!finalEmail) {
        finalEmail = `elq_${mobileDigits || Date.now().toString().slice(-6)}@eloquence.com`;
      }

      // Check if user already exists
      const existingUser = db.find('users', (u) => u.email.toLowerCase() === finalEmail.toLowerCase());
      if (existingUser) {
        return error(res, `A user with email "${finalEmail}" already exists. Please provide a unique email or mobile.`, 409);
      }

      const password_hash = await bcrypt.hash(finalPassword, 10);
      const participantCount = db.get('participants').length + 1;
      const participantId = `ELQ-2026-${String(participantCount).padStart(3, '0')}`;
      const defaultRegNo = `REG-2026-${String(participantCount).padStart(3, '0')}`;
      const finalRegNo = registration_number && registration_number.trim() ? registration_number.trim() : defaultRegNo;

      const newUser = db.insert('users', {
        email: finalEmail,
        password_hash,
        role: 'PARTICIPANT',
        is_active: true
      });

      db.insert('profiles', {
        id: newUser.id,
        full_name: full_name.trim(),
        mobile: cleanMobile
      });

      const eventTarget = (req.body.event || req.body.event_name || 'Technical Quiz').trim();

      const newParticipant = db.insert('participants', {
        id: newUser.id,
        participant_id: participantId,
        full_name: full_name.trim(),
        email: finalEmail,
        mobile: cleanMobile,
        college: college ? college.trim() : 'Engineering College',
        department: department ? department.trim() : 'Computer Science & Engineering',
        year: year ? year.trim() : '3rd Year',
        event: eventTarget,
        registration_number: finalRegNo,
        round_1_selected: false,
        round_2_selected: false,
        is_disabled: false
      });

      // Auto assign to Round 1 / matching event quiz
      if (assign_round1 || req.body.assign_quiz) {
        const matchingQuiz = db.find(
          'quizzes',
          (q) =>
            (q.event_name && q.event_name.trim().toLowerCase() === eventTarget.toLowerCase()) ||
            (q.title && q.title.trim().toLowerCase() === eventTarget.toLowerCase())
        ) || db.find('quizzes', (q) => q.round_number === 1);

        if (matchingQuiz) {
          const existingAssign = db.find(
            'quiz_assignments',
            (qa) => qa.quiz_id === matchingQuiz.id && qa.participant_id === newParticipant.id
          );
          if (!existingAssign) {
            db.insert('quiz_assignments', {
              quiz_id: matchingQuiz.id,
              participant_id: newParticipant.id,
              assigned_by: req.user.id,
              status: 'ASSIGNED'
            });
          }
        }
      }

      AuditService.log(req.user.id, 'ADMIN_REGISTER_PARTICIPANT', 'PARTICIPANT', newParticipant.id, {
        participant_id: participantId,
        full_name: newParticipant.full_name,
        email: finalEmail,
        mobile: cleanMobile
      });

      return success(res, {
        ...newParticipant,
        generated_password: finalPassword
      }, 'Participant registered successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Bulk import participants (CSV, Excel, JSON)
   */
  static async bulkImportParticipants(req, res) {
    try {
      const { participants = [], quiz_id, assign_quiz = true } = req.body;

      if (!Array.isArray(participants) || participants.length === 0) {
        return error(res, 'No participant records provided for import', 400);
      }

      const explicitQuiz = quiz_id ? db.find('quizzes', (q) => q.id === quiz_id) : null;
      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1);
      const targetDefaultQuiz = explicitQuiz || round1Quiz;
      const imported = [];
      const errors = [];

      let currentCount = db.get('participants').length;

      for (let i = 0; i < participants.length; i++) {
        const item = participants[i];
        const fullName = (item.full_name || item.name || '').trim();
        const mobile = (item.mobile || item.phone || item.phone_number || '').toString().trim();

        if (!fullName || !mobile) {
          errors.push({ row: i + 1, item, reason: 'Full Name and Phone Number are required' });
          continue;
        }

        let mobileDigits = mobile.replace(/\D/g, '');
        if (mobileDigits.length === 12 && mobileDigits.startsWith('91')) {
          mobileDigits = mobileDigits.slice(2);
        } else if (mobileDigits.length === 11 && mobileDigits.startsWith('0')) {
          mobileDigits = mobileDigits.slice(1);
        }

        const autoPassword = item.password && item.password.toString().trim()
          ? item.password.toString().trim()
          : (mobileDigits.length >= 4 ? mobileDigits.slice(0, 4) : (mobileDigits || '1234'));

        let email = (item.email || '').trim().toLowerCase();
        if (!email) {
          email = `elq_${mobileDigits || (Date.now() + i).toString().slice(-6)}@eloquence.com`;
        }

        // Check if existing
        const existing = db.find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          // generate alternative email if conflict
          email = `elq_${mobileDigits}_${i + 1}@eloquence.com`;
        }

        const password_hash = await bcrypt.hash(autoPassword, 10);
        currentCount++;
        const participantId = `ELQ-2026-${String(currentCount).padStart(3, '0')}`;

        const newUser = db.insert('users', {
          email,
          password_hash,
          role: 'PARTICIPANT',
          is_active: true
        });

        db.insert('profiles', {
          id: newUser.id,
          full_name: fullName,
          mobile
        });

        const eventTarget = (
          item.event ||
          item.event_name ||
          (explicitQuiz ? explicitQuiz.event_name || explicitQuiz.title : null) ||
          req.body.event ||
          req.body.event_name ||
          'Technical Quiz'
        ).toString().trim();

        const newParticipant = db.insert('participants', {
          id: newUser.id,
          participant_id: participantId,
          full_name: fullName,
          email,
          mobile,
          college: (item.college || item.institution || req.body.college || 'Engineering College').toString().trim(),
          department: (item.department || item.dept || item.branch || req.body.department || 'Computer Science & Engineering').toString().trim(),
          year: (item.year || req.body.year || '3rd Year').toString().trim(),
          event: eventTarget,
          registration_number: (item.registration_number || item.reg_no || `REG-2026-${String(currentCount).padStart(3, '0')}`).toString().trim(),
          round_1_selected: false,
          round_2_selected: false,
          is_disabled: false
        });

        // Match event quiz, explicit quiz, or fallback
        const targetQuiz = explicitQuiz || db.find(
          'quizzes',
          (q) =>
            (q.event_name && q.event_name.trim().toLowerCase() === eventTarget.toLowerCase()) ||
            (q.title && q.title.trim().toLowerCase() === eventTarget.toLowerCase())
        ) || round1Quiz;

        if (targetQuiz && assign_quiz) {
          const existingAssign = db.find(
            'quiz_assignments',
            (qa) => qa.quiz_id === targetQuiz.id && qa.participant_id === newParticipant.id
          );
          if (!existingAssign) {
            db.insert('quiz_assignments', {
              quiz_id: targetQuiz.id,
              participant_id: newParticipant.id,
              assigned_by: req.user ? req.user.id : null,
              status: 'ASSIGNED'
            });
          }
        }

        imported.push({
          id: newParticipant.id,
          participant_id: participantId,
          full_name: fullName,
          mobile,
          email,
          college: newParticipant.college,
          department: newParticipant.department,
          assigned_quiz: targetQuiz ? targetQuiz.title : null,
          default_password: autoPassword
        });
      }

      AuditService.log(req.user ? req.user.id : null, 'BULK_IMPORT_PARTICIPANTS', 'PARTICIPANT', 'BULK', {
        importedCount: imported.length,
        failedCount: errors.length,
        assigned_quiz: targetDefaultQuiz ? targetDefaultQuiz.title : null
      });

      return success(res, {
        importedCount: imported.length,
        failedCount: errors.length,
        imported,
        errors
      }, `Successfully imported and processed ${imported.length} scholars.`);
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

      if (!targetIds || targetIds.length === 0) {
        return error(res, 'No participants selected for assignment', 400);
      }

      const supabase = db.client;
      let assignedCount = 0;

      for (const pId of targetIds) {
        // Resolve participant record and user record
        let p = db.find('participants', (item) => item.id === pId || item.participant_id === pId || item.email === pId);
        const u = p
          ? db.find('users', (user) => user.id === p.id || (p.email && user.email?.toLowerCase() === p.email.toLowerCase()))
          : db.find('users', (user) => user.id === pId);

        const actualUserId = u ? u.id : (p ? p.id : pId);

        // Ensure participant is in participants table and in Supabase database
        if (!p) {
          const profile = db.find('profiles', (prof) => prof.id === actualUserId) || {};
          const count = db.get('participants').length + 1;
          const participantId = `ELQ-2026-${String(count).padStart(3, '0')}`;
          const regNo = `REG-2026-${String(count).padStart(3, '0')}`;

          p = db.insert('participants', {
            id: actualUserId,
            participant_id: participantId,
            full_name: profile.full_name || (u?.email || '').split('@')[0],
            email: u?.email || `elq_${Date.now().toString().slice(-6)}@eloquence.com`,
            mobile: profile.mobile || '',
            college: 'Engineering College',
            department: 'Computer Science & Engineering',
            year: '3rd Year',
            event: quiz.event_name || quiz.title || 'Technical Quiz',
            registration_number: regNo,
            round_1_selected: false,
            round_2_selected: false,
            is_disabled: false
          });

          if (supabase) {
            try {
              await supabase.from('participants').upsert([db.sanitize('participants', p)]);
            } catch (err) {
              // ignore
            }
          }
        }

        const existing = db.find(
          'quiz_assignments',
          (qa) =>
            qa.quiz_id === quiz_id &&
            (qa.participant_id === actualUserId ||
              (p && (qa.participant_id === p.id || qa.participant_id === p.participant_id || qa.participant_id === p.email)))
        );

        const assignmentRecord = {
          id: existing ? existing.id : undefined,
          quiz_id,
          participant_id: actualUserId,
          assigned_by: req.user ? req.user.id : null,
          status: 'ASSIGNED',
          assigned_at: new Date().toISOString()
        };

        if (!existing) {
          db.insert('quiz_assignments', assignmentRecord);
          assignedCount++;
        } else {
          db.update('quiz_assignments', (qa) => qa.id === existing.id, {
            status: 'ASSIGNED',
            participant_id: actualUserId
          });
        }

        // Direct Supabase upsert to guarantee persistence
        if (supabase) {
          try {
            const cleanAssign = db.sanitize('quiz_assignments', assignmentRecord);
            await supabase.from('quiz_assignments').upsert([cleanAssign]);
          } catch (e) {
            // ignore
          }
        }

        // Always update participant's event and assigned_quiz_ids in participants table
        if (p) {
          const quizEventName = quiz.event_name || quiz.title;
          const currentQuizIds = Array.isArray(p.assigned_quiz_ids) ? p.assigned_quiz_ids : [];
          const updatedQuizIds = Array.from(new Set([...currentQuizIds, quiz_id]));

          db.update('participants', (item) => item.id === p.id, {
            event: quizEventName || item.event,
            assigned_quiz_ids: updatedQuizIds
          });

          if (supabase) {
            try {
              await supabase.from('participants').update({
                event: quizEventName || p.event,
                updated_at: new Date().toISOString()
              }).eq('id', p.id);
            } catch (e) {
              // ignore
            }
          }
        }
      }

      AuditService.log(req.user ? req.user.id : null, 'ASSIGN_PARTICIPANTS_TO_QUIZ', 'QUIZ', quiz_id, {
        count: assignedCount || targetIds.length,
        quiz_title: quiz.title,
        event_name: quiz.event_name
      });

      return success(
        res,
        { assignedCount: assignedCount || targetIds.length },
        `Successfully assigned ${assignedCount || targetIds.length} scholar(s) to "${quiz.title}".`
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Unassign participants from a quiz
   */
  static async unassignFromQuiz(req, res) {
    try {
      const { quiz_id, participant_ids = [], unassign_all = false } = req.body;
      if (!quiz_id) return error(res, 'Quiz ID is required', 400);

      const quiz = db.find('quizzes', (q) => q.id === quiz_id);
      if (!quiz) return error(res, 'Quiz not found', 404);

      const supabase = db.client;
      let unassignedCount = 0;

      if (unassign_all) {
        const removed = db.filter('quiz_assignments', (qa) => qa.quiz_id === quiz_id);
        unassignedCount = removed.length;
        db.remove('quiz_assignments', (qa) => qa.quiz_id === quiz_id);

        if (supabase) {
          try {
            await supabase.from('quiz_assignments').delete().eq('quiz_id', quiz_id);
          } catch (e) {
            // ignore
          }
        }

        // Also clean up assigned_quiz_ids and event from all participants
        const allParticipants = db.get('participants') || [];
        allParticipants.forEach((p) => {
          const currentQuizIds = Array.isArray(p.assigned_quiz_ids) ? p.assigned_quiz_ids : [];
          const remainingQuizIds = currentQuizIds.filter((id) => id !== quiz_id);
          db.update('participants', (item) => item.id === p.id, {
            assigned_quiz_ids: remainingQuizIds
          });
        });
      } else {
        const targetIds = participant_ids;
        let removedCount = 0;
        for (const pId of targetIds) {
          const p = db.find('participants', (item) => item.id === pId || item.participant_id === pId || item.email === pId);
          const u = p
            ? db.find('users', (user) => user.id === p.id || (p.email && user.email?.toLowerCase() === p.email.toLowerCase()))
            : db.find('users', (user) => user.id === pId);
          const actualUserId = u ? u.id : (p ? p.id : pId);

          const idSet = new Set([
            pId,
            actualUserId,
            p ? p.id : null,
            p ? p.participant_id : null,
            p ? p.email : null
          ].filter(Boolean));

          const toRemove = db.filter(
            'quiz_assignments',
            (qa) => qa.quiz_id === quiz_id && idSet.has(qa.participant_id)
          );
          if (toRemove.length > 0) {
            removedCount += toRemove.length;
            db.remove(
              'quiz_assignments',
              (qa) => qa.quiz_id === quiz_id && idSet.has(qa.participant_id)
            );
          }

          if (supabase) {
            try {
              for (const participantRef of idSet) {
                await supabase
                  .from('quiz_assignments')
                  .delete()
                  .eq('quiz_id', quiz_id)
                  .eq('participant_id', participantRef);
              }
            } catch (e) {
              // ignore
            }
          }

          if (p) {
            const currentQuizIds = Array.isArray(p.assigned_quiz_ids) ? p.assigned_quiz_ids : [];
            const remainingQuizIds = currentQuizIds.filter((id) => id !== quiz_id);
            db.update('participants', (item) => item.id === p.id, {
              assigned_quiz_ids: remainingQuizIds
            });
          }
        }
        unassignedCount = removedCount || targetIds.length;
      }

      AuditService.log(req.user ? req.user.id : null, 'UNASSIGN_PARTICIPANTS_FROM_QUIZ', 'QUIZ', quiz_id, {
        count: unassignedCount,
        quiz_title: quiz.title
      });

      return success(
        res,
        { unassignedCount },
        `Successfully unassigned ${unassignedCount} scholar(s) from "${quiz.title}".`
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Import participants from uploaded document (PDF, Excel, Word, CSV, JSON, TXT)
   */
  static async importParticipantsFile(req, res) {
    try {
      if (!req.file) {
        return error(res, 'No file uploaded. Please select a document (PDF, Excel, Word, CSV, JSON, TXT).', 400);
      }

      const {
        quiz_id,
        event_name = 'Technical Quiz',
        college = '',
        department = '',
        year = '3rd Year',
        assign_quiz = true
      } = req.body;

      let targetEventName = event_name;
      if (quiz_id) {
        const q = db.find('quizzes', (item) => item.id === quiz_id);
        if (q) {
          targetEventName = q.event_name || q.title || event_name;
        }
      }

      const participantsList = await DocumentParserService.parseParticipantsFromDocument(
        req.file.buffer,
        req.file.originalname,
        { event_name: targetEventName, college, department, year }
      );

      if (!participantsList || participantsList.length === 0) {
        return error(res, 'No valid participant records could be extracted from the file. Please check file format.', 400);
      }

      req.body.participants = participantsList;
      req.body.quiz_id = quiz_id;
      req.body.assign_quiz = assign_quiz !== 'false' && assign_quiz !== false;
      return await ParticipantController.bulkImportParticipants(req, res);
    } catch (err) {
      return error(res, `Failed to parse document: ${err.message}`, 500);
    }
  }
}

module.exports = ParticipantController;
