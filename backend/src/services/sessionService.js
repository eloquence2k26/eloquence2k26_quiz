const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

class SessionService {
  /**
   * Registers a single active exam session.
   * If a session already exists for this participant & quiz, returns conflict unless reset.
   */
  static startSession(participantId, quizId, ipAddress, userAgent) {
    const existing = db.find('exam_sessions', (s) => s.participant_id === participantId && s.quiz_id === quizId);
    const sessionId = uuidv4();

    if (existing) {
      db.update(
        'exam_sessions',
        (s) => s.id === existing.id,
        {
          session_id: sessionId,
          is_active: true,
          last_heartbeat: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        }
      );
      return sessionId;
    }

    db.insert('exam_sessions', {
      participant_id: participantId,
      quiz_id: quizId,
      session_id: sessionId,
      is_active: true,
      last_heartbeat: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent
    });

    return sessionId;
  }

  static validateSession(participantId, quizId, sessionId) {
    const session = db.find('exam_sessions', (s) => s.participant_id === participantId && s.quiz_id === quizId);
    if (!session || !session.is_active) return false;
    return session.session_id === sessionId;
  }

  static updateHeartbeat(participantId, quizId, sessionId) {
    const session = db.find('exam_sessions', (s) => s.participant_id === participantId && s.quiz_id === quizId);
    if (!session || session.session_id !== sessionId) return false;

    db.update('exam_sessions', (s) => s.id === session.id, {
      last_heartbeat: new Date().toISOString(),
      is_active: true
    });
    return true;
  }

  static endSession(participantId, quizId) {
    db.update(
      'exam_sessions',
      (s) => s.participant_id === participantId && s.quiz_id === quizId,
      { is_active: false }
    );
  }
}

module.exports = SessionService;
