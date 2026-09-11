const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const SocketService = require('./services/socketService');

const server = http.createServer(app);
SocketService.init(server);

server.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` ELOQUENCE '26 SYMPOSIUM QUIZ API SERVER RUNNING`);
  logger.info(` Port: http://localhost:${env.PORT}`);
  logger.info(` Environment: ${env.NODE_ENV}`);
  logger.info(` WebSocket: Real-time Socket.io active`);
  logger.info(`=======================================================`);

  // Start background schedule monitoring for auto-publishing and entry windows
  const ScheduleService = require('./services/scheduleService');
  ScheduleService.startScheduler();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server process terminated');
  });
});

module.exports = server;
