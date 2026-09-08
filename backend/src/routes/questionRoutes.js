const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/questionController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/', QuestionController.getAllQuestions);
router.post('/', QuestionController.createQuestion);
router.post('/bulk', QuestionController.bulkUploadQuestions);
router.post('/:id/duplicate', QuestionController.duplicateQuestion);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);

module.exports = router;
