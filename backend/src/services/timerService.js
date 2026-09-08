const db = require('../config/db');

class TimerService {
  /**
   * Generates started_at and expires_at timestamps on the server.
   */
  static createTimer(durationMinutes) {
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    return {
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString()
    };
  }

  /**
   * Calculates remaining time in seconds based on server clock.
   */
  static getRemainingSeconds(expiresAt) {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
    return remaining;
  }

  /**
   * Checks if an attempt has expired according to server time.
   */
  static isExpired(expiresAt) {
    return this.getRemainingSeconds(expiresAt) <= 0;
  }
}

module.exports = TimerService;
