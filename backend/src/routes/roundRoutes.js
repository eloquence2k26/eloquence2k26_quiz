const express = require('express');
const router = express.Router();
const RoundController = require('../controllers/roundController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/participant-status', authenticate, RoundController.getParticipantRoundStatus);
router.get('/round1-ranking', authenticate, authorize('ADMIN'), RoundController.getRound1Ranking);
router.post('/auto-select-top-n', authenticate, authorize('ADMIN'), RoundController.autoSelectTopN);
router.post('/toggle-selection', authenticate, authorize('ADMIN'), RoundController.toggleParticipantSelection);
router.post('/publish-selection', authenticate, authorize('ADMIN'), RoundController.publishRoundSelection);

module.exports = router;
