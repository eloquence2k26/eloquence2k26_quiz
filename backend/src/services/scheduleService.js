const db = require('../config/db');
const AuditService = require('./auditService');
const logger = require('../utils/logger');

// Helper to robustly parse date and time in local server environment
function parseScheduleDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const time = timeStr || '00:00:00';
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  const dateParts = String(dateStr).split('-');
  if (dateParts.length === 3) {
    const [year, month, day] = dateParts.map(Number);
    const timeParts = String(time).split(':').map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;
    const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(localDate.getTime())) return localDate;
  }
  return new Date(`${dateStr} ${time}`);
}

class ScheduleService {
  /**
   * Check all quizzes and auto-publish scheduled ones whose start time has arrived.
   * Also auto-complete quizzes whose end time has passed.
   */
  static checkAndPublishScheduledQuizzes() {
    try {
      const quizzes = db.get('quizzes') || [];
      const now = new Date();

      quizzes.forEach((quiz) => {
        // 1. Auto-publish / activate quizzes in 'Scheduled' status when start time is reached
        if (quiz.status === 'Scheduled') {
          if (quiz.start_date && quiz.start_time) {
            const startDateTime = parseScheduleDate(quiz.start_date, quiz.start_time);
            if (startDateTime && !isNaN(startDateTime.getTime()) && now >= startDateTime) {
              db.update('quizzes', (q) => q.id === quiz.id, { status: 'Live' });
              AuditService.log('SYSTEM', 'AUTO_PUBLISH_QUIZ', 'QUIZ', quiz.id, {
                title: quiz.title,
                scheduled_start: `${quiz.start_date} ${quiz.start_time}`
              });
              logger.info(`[ScheduleService] Auto-started scheduled exam: "${quiz.title}" (${quiz.id})`);
            }
          }
        }

        // 2. Auto-complete quizzes in 'Live' or 'Published' when end time has passed
        if (quiz.status === 'Live' || quiz.status === 'Published') {
          if (quiz.end_date && quiz.end_time) {
            const endDateTime = parseScheduleDate(quiz.end_date, quiz.end_time);
            if (endDateTime && !isNaN(endDateTime.getTime()) && now > endDateTime) {
              db.update('quizzes', (q) => q.id === quiz.id, { status: 'Completed' });
              AuditService.log('SYSTEM', 'AUTO_COMPLETE_QUIZ', 'QUIZ', quiz.id, {
                title: quiz.title,
                scheduled_end: `${quiz.end_date} ${quiz.end_time}`
              });
              logger.info(`[ScheduleService] Auto-completed concluded exam: "${quiz.title}" (${quiz.id})`);
            }
          }
        }
      });
    } catch (err) {
      logger.error(`[ScheduleService] Error during schedule check: ${err.message}`);
    }
  }

  /**
   * Evaluate the entry window and full schedule status for a quiz
   * @param {object} quiz
   * @returns {object} status details
   */
  static getEntryWindowStatus(quiz) {
    if (!quiz || !quiz.start_date || !quiz.start_time) {
      return {
        hasSchedule: false,
        isEntryOpen: true,
        isEntryClosed: false,
        isBeforeStart: false,
        isAfterEnd: false,
        isLateAllowed: true,
        secondsUntilStart: 0,
        secondsUntilEnd: 0,
        remainingEntrySeconds: 0
      };
    }

    const isLiveOrPublished = quiz.status === 'Live' || quiz.status === 'Published' || Boolean(quiz.allow_late_entry);
    const startDateTime = parseScheduleDate(quiz.start_date, quiz.start_time);
    const endDateTime = quiz.end_date && quiz.end_time ? parseScheduleDate(quiz.end_date, quiz.end_time) : null;
    const now = new Date();

    const isBeforeStart = isLiveOrPublished ? false : (startDateTime && !isNaN(startDateTime.getTime()) && now < startDateTime);
    const isAfterEnd = quiz.status === 'Completed' || quiz.status === 'Closed' || (quiz.status !== 'Live' && endDateTime && !isNaN(endDateTime.getTime()) && now > endDateTime);
    const isEntryOpen = !isBeforeStart && !isAfterEnd;
    const isEntryClosed = isAfterEnd;

    const secondsUntilStart = isBeforeStart && startDateTime ? Math.max(0, Math.floor((startDateTime.getTime() - now.getTime()) / 1000)) : 0;
    const secondsUntilEnd = endDateTime && !isAfterEnd
      ? Math.max(0, Math.floor((endDateTime.getTime() - now.getTime()) / 1000))
      : 0;

    return {
      hasSchedule: true,
      startDateTime,
      endDateTime,
      isBeforeStart: Boolean(isBeforeStart),
      isAfterEnd: Boolean(isAfterEnd),
      isEntryOpen: Boolean(isEntryOpen),
      isEntryClosed: Boolean(isEntryClosed),
      isLateAllowed: Boolean(quiz.allow_late_entry ?? true),
      secondsUntilStart,
      secondsUntilEnd,
      remainingEntrySeconds: secondsUntilEnd
    };
  }

  /**
   * Start recurring background ticker (every 10 seconds)
   */
  static startScheduler(intervalMs = 10000) {
    // Run an immediate check on startup
    this.checkAndPublishScheduledQuizzes();

    const timer = setInterval(() => {
      this.checkAndPublishScheduledQuizzes();
    }, intervalMs);

    if (timer.unref) {
      timer.unref();
    }

    logger.info(`[ScheduleService] Background schedule monitor running (tick every ${intervalMs / 1000}s)`);
    return timer;
  }
}

module.exports = ScheduleService;

