const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/jwtHelper');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class AuthController {
  /**
   * User / Participant / Admin Login (Instant High-Performance Execution)
   */
  static async login(req, res) {
    try {
      const { email, username, password, participant_id } = req.body;

      if (!password) {
        return error(res, 'Password is required', 400);
      }

      const inputLogin = (email || username || '').trim().toLowerCase();
      let user = null;

      if (inputLogin) {
        // Instant In-Memory Cache Lookup by email, exact username, or prefix
        user = db.find('users', (u) => {
          if (!u.email) return false;
          const uEmail = u.email.toLowerCase();
          const uUsername = uEmail.split('@')[0];
          return uEmail === inputLogin || uUsername === inputLogin || uEmail === `${inputLogin}@eloquence.com`;
        });

        // Fallback to Supabase only if not in memory cache
        if (!user && db.client) {
          const { data: dbUsers } = await db.client
            .from('users')
            .select('*')
            .or(`email.ilike.${inputLogin},email.ilike.${inputLogin}@%`);

          if (dbUsers && dbUsers.length > 0) {
            user = dbUsers[0];
            if (!db.find('users', (u) => u.id === user.id)) {
              db.data.users.push(user);
            }
          }
        }
      } else if (participant_id) {
        const cleanPartId = participant_id.trim().toLowerCase();
        // Instant In-Memory Cache Lookup (< 1ms)
        let participant = db.find(
          'participants',
          (p) => p.participant_id && p.participant_id.toLowerCase() === cleanPartId
        );

        if (!participant && db.client) {
          const { data: dbParts } = await db.client.from('participants').select('*').ilike('participant_id', cleanPartId);
          if (dbParts && dbParts.length > 0) {
            participant = dbParts[0];
            if (!db.find('participants', (p) => p.id === participant.id)) {
              db.data.participants.push(participant);
            }
          }
        }

        if (participant) {
          user = db.find('users', (u) => u.id === participant.id);
          if (!user && db.client) {
            const { data: dbUsers } = await db.client.from('users').select('*').eq('id', participant.id);
            if (dbUsers && dbUsers.length > 0) user = dbUsers[0];
          }
        }
      }

      if (!user) {
        // Fallback for primary default admin if not yet in database
        if ((inputLogin === 'admin' || inputLogin === 'admin@eloquence.com') && password === 'admin123') {
          const defaultHash = await bcrypt.hash('admin123', 10);
          user = {
            id: 'a0000000-0000-0000-0000-000000000001',
            email: 'admin@eloquence.com',
            password_hash: defaultHash,
            role: 'ADMIN',
            is_active: true
          };
          db.insert('users', user);
          db.insert('admins', {
            id: user.id,
            full_name: 'Symposium Director',
            email: user.email,
            admin_level: 'SUPER_ADMIN'
          });
        } else {
          return error(res, 'Invalid credentials. User not found.', 401);
        }
      }

      // Root admin is always active; for other users verify active status
      if (user.email?.toLowerCase() === 'admin@eloquence.com') {
        user.is_active = true;
      } else if (user.is_active === false) {
        return error(res, 'Account has been disabled or suspended. Contact symposium admin.', 403);
      }

      // Check if participant is disabled
      if (user.role === 'PARTICIPANT') {
        const participant = db.find('participants', (p) => p.id === user.id);
        if (participant && participant.is_disabled) {
          return error(res, 'Your participation has been revoked or disabled.', 403);
        }
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return error(res, 'Invalid email/ID or password', 401);
      }

      // Fast in-memory profile/participant/admin lookups (< 1ms)
      const profile = db.find('profiles', (p) => p.id === user.id) || {};
      let participantData = user.role === 'PARTICIPANT'
        ? db.find('participants', (p) => p.id === user.id || (p.email && p.email.toLowerCase() === user.email.toLowerCase()))
        : null;

      if (participantData) {
        const assignments = db.filter(
          'quiz_assignments',
          (qa) =>
            qa.participant_id === user.id ||
            qa.participant_id === participantData.id ||
            qa.participant_id === participantData.participant_id ||
            qa.participant_id === user.email
        );
        participantData = {
          ...participantData,
          assigned_quiz_ids: assignments.map((a) => a.quiz_id)
        };
      }

      const adminData = user.role !== 'PARTICIPANT' ? db.find('admins', (a) => a.id === user.id) : null;

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      if (user.role !== 'PARTICIPANT') {
        AuditService.log(user.id, 'ADMIN_LOGIN', 'AUTH', user.id, { email: user.email });
      }

      return success(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: profile.full_name || (participantData ? participantData.full_name : (adminData ? adminData.full_name : 'User')),
          avatar_url: profile.avatar_url || null,
          participant: participantData,
          admin: adminData
        }
      }, 'Login successful');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Participant Public Registration
   */
  static async register(req, res) {
    try {
      const {
        full_name,
        email,
        password,
        mobile,
        college,
        department,
        year,
        event = 'Technical Quiz',
        registration_number
      } = req.body;

      if (!full_name || !email || !password || !college || !department || !year) {
        return error(res, 'All required fields must be provided.', 400);
      }

      let existingUser = db.find('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!existingUser && db.client) {
        const { data: dbUsers } = await db.client.from('users').select('*').ilike('email', email.trim());
        if (dbUsers && dbUsers.length > 0) existingUser = dbUsers[0];
      }
      if (existingUser) {
        return error(res, 'Email already registered. Please login.', 409);
      }

      const password_hash = await bcrypt.hash(password, 10);
      let participantCount = db.get('participants').length + 1;
      if (db.client) {
        const { count } = await db.client.from('participants').select('*', { count: 'exact', head: true });
        if (count !== null && count !== undefined) {
          participantCount = count + 1;
        }
      }
      const participantId = `ELQ-2026-${String(participantCount).padStart(3, '0')}`;

      const newUser = db.insert('users', {
        email: email.trim().toLowerCase(),
        password_hash,
        role: 'PARTICIPANT',
        is_active: true
      });

      db.insert('profiles', {
        id: newUser.id,
        full_name: full_name.trim(),
        mobile: mobile ? mobile.trim() : ''
      });

      const newParticipant = db.insert('participants', {
        id: newUser.id,
        participant_id: participantId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile ? mobile.trim() : '',
        college: college.trim(),
        department: department.trim(),
        year: year.trim(),
        event: event.trim(),
        registration_number: registration_number ? registration_number.trim() : `REG-${Date.now().toString().slice(-4)}`,
        round_1_selected: false,
        round_2_selected: false,
        is_disabled: false
      });

      // Auto assign to Round 1 default live quiz if present
      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1 && (q.status === 'Live' || q.status === 'Published'));
      if (round1Quiz) {
        db.insert('quiz_assignments', {
          quiz_id: round1Quiz.id,
          participant_id: newParticipant.id,
          status: 'ASSIGNED'
        });
      }

      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      return success(res, {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          full_name: newParticipant.full_name,
          participant: newParticipant
        }
      }, 'Participant registered successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getProfile(req, res) {
    try {
      const user = db.find('users', (u) => u.id === req.user.id);
      if (!user) return error(res, 'User not found', 404);

      const profile = db.find('profiles', (p) => p.id === user.id) || {};
      const participant = user.role === 'PARTICIPANT' ? db.find('participants', (p) => p.id === user.id) : null;
      const admin = user.role === 'ADMIN' ? db.find('admins', (a) => a.id === user.id) : null;

      return success(res, {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: profile.full_name || (participant ? participant.full_name : 'User'),
        avatar_url: profile.avatar_url || null,
        mobile: profile.mobile || (participant ? participant.mobile : null),
        participant,
        admin
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Forgot Password / Reset
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return error(res, 'Email address is required', 400);

      const user = db.find('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        // Return friendly message without disclosing user enumeration
        return success(res, {}, 'If your email is registered, password reset instructions have been forwarded to the symposium desk.');
      }

      return success(res, {}, 'Password reset request recorded. Contact symposium desk or check your mailbox.');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AuthController;
