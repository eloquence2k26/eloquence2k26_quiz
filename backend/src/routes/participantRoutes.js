const express = require('express');
const router = express.Router();
const ParticipantController = require('../controllers/participantController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/', ParticipantController.getAllParticipants);
router.post('/', ParticipantController.createParticipant);
router.post('/bulk-import', ParticipantController.bulkImportParticipants);
router.get('/:id', ParticipantController.getParticipantById);
router.patch('/:id/status', ParticipantController.toggleDisableParticipant);
router.delete('/:id', ParticipantController.deleteParticipant);
router.post('/assign', ParticipantController.assignToQuiz);

module.exports = router;
