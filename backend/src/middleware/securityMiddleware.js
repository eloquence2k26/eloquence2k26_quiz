const { error } = require('../utils/responseHelper');
const db = require('../config/db');

const validateParticipantStatus = (req, res, next) => {
  if (req.user && req.user.role === 'PARTICIPANT') {
    const participant = db.find('participants', (p) => p.id === req.user.id);
    if (!participant) {
      return error(res, 'Participant profile not found.', 404);
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

    if (attempt.participant_id !== req.user.id) {
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
