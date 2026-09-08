const { verifyToken } = require('../utils/jwtHelper');
const { error } = require('../utils/responseHelper');
const db = require('../config/db');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required. Missing or invalid Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return error(res, 'Session invalid or expired. Please login again.', 401);
  }

  const user = db.find('users', (u) => u.id === decoded.id);
  if (!user || !user.is_active) {
    return error(res, 'Account is disabled or no longer exists.', 403);
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  next();
};

module.exports = authenticate;
