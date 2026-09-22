const { error } = require('../utils/responseHelper');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }

    const role = (req.user.role || '').toUpperCase();
    const adminLevel = (req.user.admin_level || '').toUpperCase();

    // SUPER_ADMIN has full authority across all administrative endpoints
    if (role === 'SUPER_ADMIN' || adminLevel === 'SUPER_ADMIN') {
      return next();
    }

    // Check if role or admin_level matches allowed list
    const isAllowed = allowedRoles.some((r) => {
      const target = r.toUpperCase();
      if (target === 'ADMIN' && (role === 'SUPER_ADMIN' || adminLevel === 'SUPER_ADMIN')) {
        return true;
      }
      return target === role || target === adminLevel;
    });

    if (!isAllowed) {
      return error(res, 'Access denied. You do not have permission to access this resource.', 403);
    }

    next();
  };
};

module.exports = authorize;
