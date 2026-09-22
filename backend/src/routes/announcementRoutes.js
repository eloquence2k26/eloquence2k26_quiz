const express = require('express');
const router = express.Router();
const AnnouncementController = require('../controllers/announcementController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

router.get('/', authenticate, AnnouncementController.getAnnouncements);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR', 'PROCTOR'), AnnouncementController.createAnnouncement);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'COORDINATOR'), AnnouncementController.deleteAnnouncement);

module.exports = router;
