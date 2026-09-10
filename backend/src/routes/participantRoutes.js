const express = require('express');
const router = express.Router();
const multer = require('multer');
const ParticipantController = require('../controllers/participantController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(authenticate, authorize('ADMIN'));

router.get('/', ParticipantController.getAllParticipants);
router.post('/', ParticipantController.createParticipant);
router.post('/bulk-import', ParticipantController.bulkImportParticipants);
router.post('/import-file', upload.single('file'), ParticipantController.importParticipantsFile);
router.get('/:id', ParticipantController.getParticipantById);
router.put('/:id', ParticipantController.updateParticipant);
router.patch('/:id/status', ParticipantController.toggleDisableParticipant);
router.delete('/:id', ParticipantController.deleteParticipant);
router.post('/assign', ParticipantController.assignToQuiz);

module.exports = router;
