const express = require('express');
const router = express.Router();
const RoundController = require('../controllers/roundController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/', authenticate, RoundController.getAllRounds);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.createRound);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.updateRound);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.deleteRound);
router.get('/participant-status', authenticate, RoundController.getParticipantRoundStatus);
router.get('/round1-ranking', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.getRound1Ranking);
router.post('/auto-select-top-n', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.autoSelectTopN);
router.post('/toggle-selection', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.toggleParticipantSelection);
router.post('/publish-selection', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), RoundController.publishRoundSelection);
router.post('/acknowledge-elimination', authenticate, RoundController.acknowledgeElimination);

module.exports = router;

