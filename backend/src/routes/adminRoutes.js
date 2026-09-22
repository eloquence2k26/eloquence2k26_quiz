const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.use(authenticate);

// Analytics, Events & Roles Matrix (Shared Staff & Coordinator Console)
router.get('/dashboard-stats', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR', 'VOLUNTEER'), AdminController.getDashboardStats);
router.get('/events', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR'), AdminController.getEvents);
router.post('/events', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), AdminController.createEvent);
router.put('/events/:id', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), AdminController.updateEvent);
router.delete('/events/:id', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), AdminController.deleteEvent);
router.get('/roles', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR', 'VOLUNTEER'), AdminController.getRoles);

// System Settings, Database Synchronization & Audit (Admin / Super Admin Only)
router.get('/settings', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.getSettings);
router.put('/settings', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.updateSettings);
router.get('/audit-logs', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.getAuditLogs);
router.post('/sync-db', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.syncDatabase);
router.get('/sync-db', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.syncDatabase);

// Staff & User Accounts Management (Read: Coordinators/Admins; Mutate: Admin/Super Admin)
router.get('/users', authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), AdminController.getUsers);
router.post('/users', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.createUser);
router.put('/users/:id', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.updateUser);
router.delete('/users/:id', authorize('ADMIN', 'SUPER_ADMIN'), AdminController.deleteUser);

module.exports = router;
