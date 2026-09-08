const db = require('../config/db');

class AuditService {
  static log(adminId, action, entityType, entityId, metadata = {}) {
    try {
      db.insert('audit_logs', {
        admin_id: adminId || null,
        action,
        entity_type: entityType,
        entity_id: String(entityId || ''),
        timestamp: new Date().toISOString(),
        metadata
      });
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }
}

module.exports = AuditService;
