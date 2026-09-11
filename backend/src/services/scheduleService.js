const db = require('../config/db');
const AuditService = require('./auditService');
const logger = require('../utils/logger');

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
        // 1. Auto-publish quizzes in 'Scheduled' status when start time is reached
        if (quiz.status === 'Scheduled') {
          if (quiz.start_date && quiz.start_time) {
            const startDateTime = new Date(`${quiz.start_date}T${quiz.start_time}`);
            if (!isNaN(startDateTime.getTime()) && now >= startDateTime) {
              db.update('quizzes', (q) => q.id === quiz.id, { status: 'Published' });
              AuditService.log('SYSTEM', 'AUTO_PUBLISH_QUIZ', 'QUIZ', quiz.id, {
                title: quiz.title,
                scheduled_start: `${quiz.start_date} ${quiz.start_time}`
              });
              logger.info(`[ScheduleService] Auto-published scheduled exam: "${quiz.title}" (${quiz.id})`);
            }
          }
        }

        // 2. Auto-complete quizzes in 'Live' or 'Published' when end time has passed
        if (quiz.status === 'Live' || quiz.status === 'Published') {
          if (quiz.end_date && quiz.end_time) {
            const endDateTime = new Date(`${quiz.end_date}T${quiz.end_time}`);
            if (!isNaN(endDateTime.getTime()) && now > endDateTime) {
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
        isLateAllowed: Boolean(quiz?.allow_late_entry)
      };
    }

    const entryWindowMinutes = Number(quiz.entry_window_minutes) || 5;
    const startDateTime = new Date(`${quiz.start_date}T${quiz.start_time}`);
    const endDateTime = quiz.end_date && quiz.end_time ? new Date(`${quiz.end_date}T${quiz.end_time}`) : null;
    const entryCloseTime = new Date(startDateTime.getTime() + entryWindowMinutes * 60 * 1000);
    const now = new Date();

    const isBeforeStart = now < startDateTime;
    const isAfterEnd = endDateTime ? now > endDateTime : false;
    const isLateAllowed = Boolean(quiz.allow_late_entry || quiz.late_entry_allowed);
    const isEntryOpen = !isBeforeStart && !isAfterEnd && (now <= entryCloseTime || isLateAllowed);
    const isEntryClosed = !isBeforeStart && (now > entryCloseTime && !isLateAllowed);

    const secondsUntilStart = isBeforeStart ? Math.max(0, Math.floor((startDateTime.getTime() - now.getTime()) / 1000)) : 0;
    const remainingEntrySeconds = isEntryOpen && !isLateAllowed
      ? Math.max(0, Math.floor((entryCloseTime.getTime() - now.getTime()) / 1000))
      : 0;
    const secondsUntilEnd = endDateTime && !isAfterEnd
      ? Math.max(0, Math.floor((endDateTime.getTime() - now.getTime()) / 1000))
      : 0;

    return {
      hasSchedule: true,
      startDateTime,
      endDateTime,
      entryCloseTime,
      entryWindowMinutes,
      isBeforeStart,
      isAfterEnd,
      isEntryOpen,
      isEntryClosed,
      isLateAllowed,
      secondsUntilStart,
      secondsUntilEnd,
      remainingEntrySeconds
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
