const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/quiz-results/:quizId/csv', ReportController.exportQuizResultsCSV);
router.get('/participants/csv', ReportController.exportParticipantsCSV);

module.exports = router;
