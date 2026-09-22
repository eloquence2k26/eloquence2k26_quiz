const { verifyToken } = require('../utils/jwtHelper');
const { error } = require('../utils/responseHelper');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication required. Missing or invalid Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return error(res, 'Session invalid or expired. Please login again.', 401);
    }

    let user = db.find('users', (u) => u.id === decoded.id || (decoded.email && u.email && u.email.toLowerCase() === decoded.email.toLowerCase()));

    // Fallback lookup from Supabase if not in in-memory array
    if (!user && db.client) {
      try {
        const { data } = await db.client.from('users').select('*').eq('id', decoded.id);
        if (data && data.length > 0) {
          user = data[0];
          db.data.users.push(user);
        }
      } catch (dbErr) {
        // continue
      }
    }

    // Default admin / coordinator fallback check
    if (!user) {
      if (decoded.email === 'admin@eloquence.com' || decoded.id === 'a0000000-0000-0000-0000-000000000001') {
        user = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'admin@eloquence.com',
          role: 'ADMIN',
          is_active: true
        };
      } else if (decoded.email === 'coordinator@eloquence.com' || decoded.id === 'a0000000-0000-0000-0000-000000000002') {
        user = {
          id: 'a0000000-0000-0000-0000-000000000002',
          email: 'coordinator@eloquence.com',
          role: 'COORDINATOR',
          is_active: true
        };
      }
    }

    if (!user) {
      return error(res, 'Session expired or user not found. Please login again.', 401);
    }

    if (user.is_active === false) {
      return error(res, 'Account is disabled. Please contact administrator.', 403);
    }

    const adminData = db.find('admins', (a) => a.id === user.id || (a.email && a.email.toLowerCase() === user.email?.toLowerCase()));

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || decoded.role || 'PARTICIPANT',
      admin_level: adminData ? adminData.admin_level : (decoded.admin_level || (user.role !== 'PARTICIPANT' ? user.role : null))
    };

    next();
  } catch (err) {
    return error(res, 'Authentication failed: ' + err.message, 401);
  }
};

module.exports = authenticate;
