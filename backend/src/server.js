const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` ELOQUENCE '26 SYMPOSIUM QUIZ API SERVER RUNNING`);
  logger.info(` Port: http://localhost:${env.PORT}`);
  logger.info(` Environment: ${env.NODE_ENV}`);
  logger.info(`=======================================================`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server process terminated');
  });
});

module.exports = server;
