import express from 'express';
import { 
  getQuizzes, 
  createQuiz, 
  updateQuiz, 
  deleteQuiz, 
  getQuestionsForQuiz, 
  addQuestionToQuiz, 
  bulkAddQuestionsToQuiz,
  updateQuestionInQuiz, 
  deleteQuestionFromQuiz,
  getRegistrations,
  grantAccess,
  revokeAccess,
  toggleAccessDirect,
  getResults,
  getViolations,
  getRetests,
  grantRetestAttempt,
  revokeRetestAttempt,
  approveRetestLegacy,
  rejectRetestLegacy,
  getSubmissions,
  qualifyNextRound,
  toggleQualification
} from '../controllers/adminQuizController.js';

const router = express.Router();

// GET & POST /api/admin/quizzes
router.get('/quizzes', getQuizzes);
router.post('/quizzes', createQuiz);
router.put('/quizzes/:id', updateQuiz);
router.delete('/quizzes/:id', deleteQuiz);

// Questions inside quiz
router.get('/quizzes/:id/questions', getQuestionsForQuiz);
router.post('/quizzes/:id/questions', addQuestionToQuiz);
router.post('/quizzes/:id/questions/bulk', bulkAddQuestionsToQuiz);
router.put('/quizzes/:id/questions/:qId', updateQuestionInQuiz);
router.delete('/quizzes/:id/questions/:qId', deleteQuestionFromQuiz);

// Submissions & Qualification
router.get('/quizzes/:quizId/submissions', getSubmissions);
router.post('/quizzes/:quizId/qualify-next-round', qualifyNextRound);
router.post('/quizzes/:quizId/toggle-qualification', toggleQualification);

// Registrations & Access Control
router.get('/quizzes/:quizId/registrations', getRegistrations);
router.post('/registrations/:id/grant-access', grantAccess);
router.post('/registrations/:id/revoke-access', revokeAccess);
router.post('/quizzes/:quizId/access', toggleAccessDirect);

// Results & Security Audit
router.get('/results', getResults);
router.get('/violations', getViolations);

// Retests & Approvals
router.get('/retests', getRetests);
router.post('/attempts/:id/grant-retest', grantRetestAttempt);
router.post('/attempts/:id/revoke-retest', revokeRetestAttempt);
router.post('/retests/approve', approveRetestLegacy);
router.post('/retests/reject', rejectRetestLegacy);

export default router;
