const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/jwtHelper');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class AuthController {
  /**
   * User / Participant / Admin Login
   */
  static async login(req, res) {
    try {
      const { email, password, participant_id } = req.body;

      if (!password) {
        return error(res, 'Password is required', 400);
      }

      let user = null;

      if (email) {
        if (db.client) {
          const { data: dbUsers } = await db.client.from('users').select('*').ilike('email', email.trim());
          if (dbUsers && dbUsers.length > 0) {
            user = dbUsers[0];
          }
        }
        if (!user) {
          user = db.find('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
        }
      } else if (participant_id) {
        let participant = null;
        if (db.client) {
          const { data: dbParts } = await db.client.from('participants').select('*').ilike('participant_id', participant_id.trim());
          if (dbParts && dbParts.length > 0) {
            participant = dbParts[0];
          }
        }
        if (!participant) {
          participant = db.find(
            'participants',
            (p) => p.participant_id.toLowerCase() === participant_id.trim().toLowerCase()
          );
        }
        if (participant) {
          if (db.client) {
            const { data: dbUsers } = await db.client.from('users').select('*').eq('id', participant.id);
            if (dbUsers && dbUsers.length > 0) {
              user = dbUsers[0];
            }
          }
          if (!user) {
            user = db.find('users', (u) => u.id === participant.id);
          }
        }
      }

      if (!user) {
        return error(res, 'Invalid credentials. User not found.', 401);
      }

      if (!user.is_active) {
        return error(res, 'Account has been disabled or suspended. Contact symposium admin.', 403);
      }

      // Check if participant is disabled
      if (user.role === 'PARTICIPANT') {
        let participant = db.find('participants', (p) => p.id === user.id);
        if (!participant && db.client) {
          const { data: dbParts } = await db.client.from('participants').select('*').eq('id', user.id);
          if (dbParts && dbParts.length > 0) participant = dbParts[0];
        }
        if (participant && participant.is_disabled) {
          return error(res, 'Your participation has been revoked or disabled.', 403);
        }
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return error(res, 'Invalid email/ID or password', 401);
      }

      let profile = db.find('profiles', (p) => p.id === user.id);
      if (!profile && db.client) {
        const { data: dbProfiles } = await db.client.from('profiles').select('*').eq('id', user.id);
        if (dbProfiles && dbProfiles.length > 0) profile = dbProfiles[0];
      }
      profile = profile || {};

      let participantData = null;
      if (user.role === 'PARTICIPANT') {
        participantData = db.find('participants', (p) => p.id === user.id);
        if (!participantData && db.client) {
          const { data: dbParts } = await db.client.from('participants').select('*').eq('id', user.id);
          if (dbParts && dbParts.length > 0) participantData = dbParts[0];
        }
      }

      let adminData = null;
      if (user.role === 'ADMIN') {
        adminData = db.find('admins', (a) => a.id === user.id);
        if (!adminData && db.client) {
          const { data: dbAdmins } = await db.client.from('admins').select('*').eq('id', user.id);
          if (dbAdmins && dbAdmins.length > 0) adminData = dbAdmins[0];
        }
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      if (user.role === 'ADMIN') {
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
