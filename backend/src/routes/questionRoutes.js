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

router.use(authenticate, authorize('ADMIN'));

router.get('/', QuestionController.getAllQuestions);
router.post('/', QuestionController.createQuestion);
router.post('/bulk', QuestionController.bulkUploadQuestions);
router.post('/import-file', upload.single('file'), QuestionController.importQuestionsFile);
router.post('/:id/duplicate', QuestionController.duplicateQuestion);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);

module.exports = router;

