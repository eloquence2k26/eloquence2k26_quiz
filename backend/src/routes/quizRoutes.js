const express = require('express');
const router = express.Router();
const QuizController = require('../controllers/quizController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/', authenticate, QuizController.getAllQuizzes);
router.get('/available', authenticate, QuizController.getAllQuizzes);
router.get('/:id', authenticate, QuizController.getQuizById);

router.post('/', authenticate, authorize('ADMIN'), QuizController.createQuiz);
router.put('/:id', authenticate, authorize('ADMIN'), QuizController.updateQuiz);
router.delete('/:id', authenticate, authorize('ADMIN'), QuizController.deleteQuiz);
router.patch('/:id/status', authenticate, authorize('ADMIN'), QuizController.updateQuizStatus);
router.patch('/:id/entry-control', authenticate, authorize('ADMIN'), QuizController.updateEntryControl);

module.exports = router;
