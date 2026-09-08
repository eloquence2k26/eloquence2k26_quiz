const logger = require('../utils/logger');
const { error } = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err.name === 'ValidationError') {
    return error(res, err.message, 400);
  }

  if (err.name === 'UnauthorizedError') {
    return error(res, 'Invalid authentication token', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected error occurred on the server. Please contact symposium admin.'
    : err.message || 'Internal Server Error';

  return error(res, message, statusCode);
};

module.exports = errorHandler;
