const express = require('express');
const router = express.Router();
const multer = require('multer');
const QuestionController = require('../controllers/questionController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB file limit
});

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'));

router.get('/', QuestionController.getAllQuestions);
router.post('/', QuestionController.createQuestion);
router.post('/bulk', QuestionController.bulkUploadQuestions);
router.post('/import-file', upload.single('file'), QuestionController.importQuestionsFile);
router.post('/delete-all', QuestionController.deleteAllQuestions);
router.post('/bulk-delete', QuestionController.deleteAllQuestions);
router.post('/:id/duplicate', QuestionController.duplicateQuestion);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/all', QuestionController.deleteAllQuestions);
router.delete('/delete-all', QuestionController.deleteAllQuestions);
router.delete('/', QuestionController.deleteAllQuestions);
router.delete('/:id', QuestionController.deleteQuestion);

module.exports = router;

