const express = require('express');
const router = express.Router();
const ResultController = require('../controllers/resultController');
const authenticate = require('../middleware/authMiddleware');

router.get('/quiz/:quizId', authenticate, ResultController.getQuizResults);
router.get('/attempt/:attemptId', authenticate, ResultController.getAttemptResult);

module.exports = router;
