const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

class SocketService {
  static init(server) {
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      logger.info(`[WebSocket] Client connected: ${socket.id}`);

      // User can join their own private room using user_id/participant_id
      socket.on('join_user_room', (userId) => {
        if (userId) {
          socket.join(`user_${userId}`);
          logger.info(`[WebSocket] Socket ${socket.id} joined room user_${userId}`);
        }
      });

      // Join general participants room
      socket.on('join_participants', () => {
        socket.join('participants_channel');
      });

      socket.on('disconnect', () => {
        logger.info(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });

    return io;
  }

  static getIO() {
    return io;
  }

  // Emit event to all connected clients
  static broadcast(event, data) {
    if (io) {
      io.emit(event, data);
    }
  }

  // Emit event to a specific participant/user
  static emitToUser(userId, event, data) {
    if (io && userId) {
      io.to(`user_${userId}`).emit(event, data);
      // Also broadcast to general participants channel for instant refresh
      io.emit(event, data);
    }
  }

  // Real-time event helpers
  static notifyQuizUpdate(data = {}) {
    this.broadcast('QUIZ_UPDATED', data);
    this.broadcast('REFRESH_DASHBOARD', data);
  }

  static notifyExamRestart(participantId, quizId) {
    this.emitToUser(participantId, 'EXAM_RESTARTED', { participant_id: participantId, quiz_id: quizId });
    this.broadcast('REFRESH_DASHBOARD', { type: 'EXAM_RESTARTED', participant_id: participantId, quiz_id: quizId });
  }

  static notifyExamSubmitted(data = {}) {
    this.broadcast('EXAM_SUBMITTED', data);
    this.broadcast('RESULTS_UPDATED', data);
    this.broadcast('LEADERBOARD_UPDATED', data);
    this.broadcast('REFRESH_DASHBOARD', data);
  }

  static notifyExamTerminated(data = {}) {
    this.broadcast('EXAM_TERMINATED', data);
    this.broadcast('RESULTS_UPDATED', data);
    this.broadcast('LEADERBOARD_UPDATED', data);
    this.broadcast('REFRESH_DASHBOARD', data);
  }

  static notifyResultsUpdated(data = {}) {
    this.broadcast('RESULTS_UPDATED', data);
    this.broadcast('LEADERBOARD_UPDATED', data);
    this.broadcast('REFRESH_DASHBOARD', data);
  }

  static notifyRoundPublished(data = {}) {
    this.broadcast('ROUND_STATUS_UPDATED', data);
    this.broadcast('RESULTS_UPDATED', data);
    this.broadcast('LEADERBOARD_UPDATED', data);
    this.broadcast('REFRESH_DASHBOARD', data);
  }

  static notifyAnnouncement(data = {}) {
    this.broadcast('ANNOUNCEMENT_CREATED', data);
  }
}

module.exports = SocketService;
