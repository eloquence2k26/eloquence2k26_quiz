const { error } = require('../utils/responseHelper');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return error(res, 'Access denied. You do not have permission to access this resource.', 403);
    }
    next();
  };
};

module.exports = authorize;
