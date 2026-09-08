const express = require('express');
const router = express.Router();
const ResultController = require('../controllers/resultController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/overview/:quizId', authenticate, authorize('ADMIN'), ResultController.getEventOverview);
router.post('/publish/:quizId', authenticate, authorize('ADMIN'), ResultController.publishAllResults);
router.post('/send-selective/:quizId', authenticate, authorize('ADMIN'), ResultController.sendSelectiveResults);
router.get('/quiz/:quizId', authenticate, ResultController.getQuizResults);
router.get('/attempt/:attemptId', authenticate, ResultController.getAttemptResult);

module.exports = router;
