const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard-stats', AdminController.getDashboardStats);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);
router.get('/audit-logs', AdminController.getAuditLogs);

module.exports = router;
