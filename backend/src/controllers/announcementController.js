const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class AnnouncementController {
  /**
   * Get Active Announcements (Target filtered)
   */
  static async getAnnouncements(req, res) {
    try {
      let announcements = db.get('announcements');
      announcements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (req.user && req.user.role === 'PARTICIPANT') {
        const participant = db.find('participants', (p) => p.id === req.user.id);
        announcements = announcements.filter((a) => {
          if (a.target_type === 'ALL') return true;
          if (a.target_type === 'ROUND_1') return true;
          if (a.target_type === 'ROUND_2' && participant && participant.round_1_selected) return true;
          return false;
        });
      }

      return success(res, announcements);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create Announcement (Admin)
   */
  static async createAnnouncement(req, res) {
    try {
      const { title, message, target_type = 'ALL', quiz_id } = req.body;
      if (!title || !message) {
        return error(res, 'Title and message are required', 400);
      }

      const announcement = db.insert('announcements', {
        title: title.trim(),
        message: message.trim(),
        target_type,
        quiz_id: quiz_id || null,
        is_active: true,
        created_by: req.user.id
      });

      AuditService.log(req.user.id, 'CREATE_ANNOUNCEMENT', 'ANNOUNCEMENT', announcement.id, { title });

      return success(res, announcement, 'Announcement published successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete Announcement (Admin)
   */
  static async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const removed = db.remove('announcements', (a) => a.id === id);
      if (!removed) return error(res, 'Announcement not found', 404);

      return success(res, {}, 'Announcement removed');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = AnnouncementController;
