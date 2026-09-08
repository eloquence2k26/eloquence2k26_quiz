const express = require('express');
const router = express.Router();
const SecurityController = require('../controllers/securityController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/violations', SecurityController.getAllViolations);
router.get('/stats', SecurityController.getViolationStats);

module.exports = router;
