const express = require('express');
const router = express.Router();
const ExamController = require('../controllers/examController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validateParticipantStatus, validateActiveExamSession } = require('../middleware/securityMiddleware');

// Participant exam arena routes
router.post(
  '/:quizId/start',
  authenticate,
  authorize('PARTICIPANT', 'ADMIN'),
  validateParticipantStatus,
  ExamController.startExam
);

router.post(
  '/attempts/:attemptId/answers',
  authenticate,
  validateParticipantStatus,
  validateActiveExamSession,
  ExamController.saveAnswer
);

router.post(
  '/attempts/:attemptId/security-event',
  authenticate,
  validateParticipantStatus,
  ExamController.recordSecurityEvent
);

router.post(
  '/attempts/:attemptId/submit',
  authenticate,
  validateParticipantStatus,
  ExamController.submitExam
);

// Admin live monitoring & control routes
router.get(
  '/live/:quizId',
  authenticate,
  authorize('ADMIN'),
  ExamController.getLiveMonitoring
);

router.post(
  '/attempts/:attemptId/admin-terminate',
  authenticate,
  authorize('ADMIN'),
  ExamController.adminTerminateAttempt
);

router.get(
  '/admin/all-attempts',
  authenticate,
  authorize('ADMIN'),
  ExamController.getAllAttemptsAdmin
);

router.post(
  '/attempts/:attemptId/admin-restart',
  authenticate,
  authorize('ADMIN'),
  ExamController.adminRestartAttempt
);

module.exports = router;
