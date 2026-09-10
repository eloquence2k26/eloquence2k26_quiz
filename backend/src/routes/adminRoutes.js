const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard-stats', AdminController.getDashboardStats);
router.get('/events', AdminController.getEvents);
router.post('/events', AdminController.createEvent);
router.put('/events/:id', AdminController.updateEvent);
router.delete('/events/:id', AdminController.deleteEvent);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);
router.get('/audit-logs', AdminController.getAuditLogs);
router.post('/sync-db', AdminController.syncDatabase);
router.get('/sync-db', AdminController.syncDatabase);

// Staff & User Management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/roles', AdminController.getRoles);

module.exports = router;
