import express from 'express';
import { 
  getParticipantQuizzes, 
  registerParticipant, 
  checkQuizAccess, 
  startAttempt, 
  saveAnswer, 
  recordViolation, 
  submitAttempt, 
  checkQualification, 
  requestRetestPermission 
} from '../controllers/participantQuizController.js';

const router = express.Router();

// GET /api/participant/quizzes
router.get('/quizzes', getParticipantQuizzes);

// POST /api/participant/quizzes/:id/register
router.post('/quizzes/:id/register', registerParticipant);

// GET /api/participant/quizzes/:id/check
router.get('/quizzes/:id/check', checkQuizAccess);

// POST /api/participant/quizzes/:id/start
router.post('/quizzes/:id/start', startAttempt);

// Save Answer
router.post('/quizzes/:id/answer', saveAnswer);
router.post('/attempts/:id/answer', saveAnswer);

// Record Violation
router.post('/quizzes/:id/violation', recordViolation);
router.post('/attempts/:id/violation', recordViolation);

// Submit Attempt
router.post('/quizzes/:id/submit', submitAttempt);
router.post('/attempts/:id/submit', submitAttempt);

// Qualification Status
router.get('/qualification-status', checkQualification);

// Request Retest
router.post('/quizzes/:id/request-retest', requestRetestPermission);

export default router;
