const { error } = require('../utils/responseHelper');
const db = require('../config/db');

const validateParticipantStatus = (req, res, next) => {
  if (req.user && req.user.role === 'PARTICIPANT') {
    const participant = db.find('participants', (p) =>
      p.id === req.user.id ||
      p.participant_id === req.user.id ||
      (p.email && p.email.toLowerCase() === (req.user.email || '').toLowerCase())
    );
    if (!participant) {
      // If user exists and is active, let them proceed even if profile is in sync
      const user = db.find('users', (u) => u.id === req.user.id);
      if (!user || user.is_active === false) {
        return error(res, 'Participant account is disabled or suspended.', 403);
      }
      return next();
    }
    if (participant.is_disabled) {
      return error(res, 'Your participant account has been disabled by event administrators.', 403);
    }
  }
  next();
};

const validateActiveExamSession = (req, res, next) => {
  const attemptId = req.params.attemptId || req.body.attemptId;
  const sessionId = req.headers['x-exam-session-id'] || req.body.sessionId;

  if (attemptId && req.user && req.user.role === 'PARTICIPANT') {
    const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
    if (!attempt) {
      return error(res, 'Exam attempt not found.', 404);
    }

    const participant = db.find(
      'participants',
      (p) =>
        p.id === req.user.id ||
        p.participant_id === req.user.id ||
        (p.email && p.email.toLowerCase() === (req.user.email || '').toLowerCase())
    );

    const possibleUserIds = new Set([
      req.user.id,
      req.user.email ? req.user.email.toLowerCase() : null,
      participant ? participant.id : null,
      participant ? participant.participant_id : null,
      participant ? participant.registration_number : null
    ].filter(Boolean));

    const matchesUser =
      possibleUserIds.has(attempt.participant_id) ||
      (attempt.participant_id && possibleUserIds.has(attempt.participant_id.toLowerCase()));

    if (!matchesUser) {
      return error(res, 'Unauthorized access to this examination attempt.', 403);
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return error(res, `This exam attempt has already been ${attempt.status.toLowerCase()}.`, 400);
    }

    if (sessionId && attempt.session_id !== sessionId) {
      return error(res, 'Concurrent or invalid session detected. Access revoked for this window.', 409);
    }
  }

  next();
};

module.exports = {
  validateParticipantStatus,
  validateActiveExamSession
};
