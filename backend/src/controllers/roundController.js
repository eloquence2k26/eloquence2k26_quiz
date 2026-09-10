const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const RoundSelectionService = require('../services/roundSelectionService');
const AuditService = require('../services/auditService');

class RoundController {
  /**
   * Get all symposium rounds (dynamically synced with events, quizzes, and rounds table)
   */
  static async getAllRounds(req, res) {
    try {
      let rounds = db.get('rounds') || [];
      const quizzes = db.get('quizzes') || [];
      const participants = db.get('participants') || [];
      let events = db.get('events') || [];

      // If rounds is empty in memory, fetch live from Supabase
      if (rounds.length === 0 && db.client) {
        const { data: dbRounds } = await db.client.from('rounds').select('*');
        if (dbRounds && dbRounds.length > 0) {
          rounds = dbRounds;
          db.data.rounds = dbRounds;
        }
      }

      // If events is empty in memory, fetch live from Supabase
      if (events.length === 0 && db.client) {
        const { data: dbEvents } = await db.client.from('events').select('*');
        if (dbEvents && dbEvents.length > 0) {
          events = dbEvents;
          db.data.events = dbEvents;
        }
      }

      // If events collection is still empty, extract distinct events from quizzes or fallback
      if (events.length === 0) {
        const uniqueEvents = new Map();
        quizzes.forEach((q) => {
          const t = q.event_name || q.title;
          if (t && !uniqueEvents.has(t.toLowerCase())) {
            uniqueEvents.set(t.toLowerCase(), {
              id: q.event_id || q.id || 'c0000000-0000-0000-0000-000000000001',
              title: t,
              code: q.event_code || 'ELQ26',
              description: q.description || ''
            });
          }
        });
        events = Array.from(uniqueEvents.values());
      }

      if (events.length === 0) {
        events = [{
          id: 'c0000000-0000-0000-0000-000000000001',
          title: 'Technical Quiz',
          code: 'ELQ26',
          description: 'Official National Symposium Technical MCQ Championship'
        }];
      }

      // Ensure every registered event has at least a Round 1
      events.forEach((ev) => {
        const hasRound = rounds.some(
          (r) => r.event_id === ev.id || (r.event_name && r.event_name.toLowerCase() === ev.title.toLowerCase())
        );
        if (!hasRound) {
          const newR = {
            id: `rnd-1-${ev.id || 'default'}`,
            event_id: ev.id || 'c0000000-0000-0000-0000-000000000001',
            event_name: ev.title,
            round_number: 1,
            round_name: 'Round 1',
            description: `${ev.title} Examination Round 1`,
            is_active: true,
            is_published: false
          };
          rounds.push(newR);
        }
      });

      // Enrich rounds with event details, quizzes, and qualifier counts
      const enriched = rounds.map((r) => {
        // Resolve event
        const parentEvent = events.find(
          (e) => e.id === r.event_id || (r.event_name && e.title.toLowerCase() === r.event_name.toLowerCase())
        );
        const eventTitle = parentEvent ? parentEvent.title : (r.event_name || 'General Event');
        const eventId = parentEvent ? parentEvent.id : (r.event_id || 'c0000000-0000-0000-0000-000000000001');
        const eventCode = parentEvent ? parentEvent.code : 'ELQ26';

        // Filter quizzes belonging strictly to this round AND this event
        const roundQuizzes = quizzes.filter((q) => {
          const roundMatch = Number(q.round_number) === Number(r.round_number) || q.round_id === r.id;
          const eventMatch =
            (eventId && q.event_id === eventId) ||
            (eventTitle && (
              q.event_name?.toLowerCase() === eventTitle.toLowerCase() ||
              q.title?.toLowerCase() === eventTitle.toLowerCase()
            ));
          return roundMatch && eventMatch;
        });

        // Filter participants for this event
        const eventParticipants = participants.filter(
          (p) => !p.event || p.event.toLowerCase() === eventTitle.toLowerCase()
        );

        let qualifiersCount = 0;
        if (Number(r.round_number) === 1) {
          qualifiersCount = eventParticipants.length || participants.length;
        } else if (Number(r.round_number) === 2) {
          qualifiersCount = eventParticipants.filter((p) => p.round_1_selected).length;
        } else {
          qualifiersCount = eventParticipants.filter(
            (p) => p[`round_${r.round_number}_selected`] || p.round_1_selected
          ).length;
        }

        return {
          ...r,
          event_id: eventId,
          event_name: eventTitle,
          event_code: eventCode,
          round_name: r.round_name || `Round ${r.round_number}`,
          quizzes_count: roundQuizzes.length,
          quizzes: roundQuizzes.map((q) => ({
            id: q.id,
            title: q.title,
            status: q.status,
            duration_minutes: q.duration_minutes,
            total_questions: q.total_questions,
            start_date: q.start_date,
            end_date: q.end_date
          })),
          qualifiers_count: qualifiersCount
        };
      });

      // Sort by event name, then round number
      enriched.sort((a, b) => {
        const cmp = (a.event_name || '').localeCompare(b.event_name || '');
        if (cmp !== 0) return cmp;
        return (Number(a.round_number) || 0) - (Number(b.round_number) || 0);
      });

      return success(res, enriched);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create or register a new round scoped to an event
   */
  static async createRound(req, res) {
    try {
      const { round_number, round_name, description, event_id, event_name } = req.body;
      if (!round_number) {
        return error(res, 'round_number is required', 400);
      }

      const num = Number(round_number);
      const events = db.get('events') || [];
      const quizzes = db.get('quizzes') || [];

      // Find or resolve event
      let targetEvent = events.find(
        (e) => (event_id && e.id === event_id) || (event_name && e.title.toLowerCase() === event_name.trim().toLowerCase())
      );

      if (!targetEvent && (event_name || event_id)) {
        const title = (event_name && event_name.trim()) || 'Symposium Competition';
        const code = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || 'ELQ26';
        targetEvent = db.insert('events', {
          title,
          code,
          description: `${title} symposium event`,
          is_active: true
        });
      }

      const resolvedEventId = targetEvent ? targetEvent.id : (event_id || 'c0000000-0000-0000-0000-000000000001');
      const resolvedEventTitle = targetEvent ? targetEvent.title : (event_name || 'General Event');

      // Check if this round number already exists for this event
      const existing = db.find(
        'rounds',
        (r) =>
          Number(r.round_number) === num &&
          (r.event_id === resolvedEventId || (r.event_name && r.event_name.toLowerCase() === resolvedEventTitle.toLowerCase()))
      );

      if (existing) {
        // If already exists, update name/description
        const updated = db.update('rounds', (r) => r.id === existing.id, {
          round_name: round_name ? round_name.trim() : existing.round_name,
          description: description !== undefined ? description.trim() : existing.description,
          event_id: resolvedEventId,
          event_name: resolvedEventTitle
        });
        return success(res, updated, `Round ${num} already exists for this event and was updated`);
      }

      const newRound = db.insert('rounds', {
        event_id: resolvedEventId,
        event_name: resolvedEventTitle,
        round_number: num,
        round_name: round_name ? round_name.trim() : `Round ${num}`,
        description: description ? description.trim() : `${resolvedEventTitle} Examination Round ${num}`,
        is_active: true,
        is_published: false
      });

      // If any quizzes for this event match this round number, link them
      quizzes.forEach((q) => {
        const matchesEvent =
          (resolvedEventId && q.event_id === resolvedEventId) ||
          (resolvedEventTitle && (q.event_name?.toLowerCase() === resolvedEventTitle.toLowerCase() || q.title?.toLowerCase() === resolvedEventTitle.toLowerCase()));
        if (matchesEvent && Number(q.round_number) === num && !q.round_id) {
          db.update('quizzes', (qz) => qz.id === q.id, { round_id: newRound.id });
        }
      });

      AuditService.log(req.user.id, 'CREATE_ROUND', 'ROUND', newRound.id, {
        round_number: num,
        event_name: resolvedEventTitle
      });

      return success(res, newRound, `${newRound.round_name} created successfully`, 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update round details (name, number, description, status)
   */
  static async updateRound(req, res) {
    try {
      const { id } = req.params;
      const { round_name, round_number, description, is_active, is_published } = req.body;

      const round = db.find('rounds', (r) => r.id === id || String(r.round_number) === String(id));
      if (!round) {
        return error(res, 'Round not found', 404);
      }

      const updates = {};
      if (round_name !== undefined) updates.round_name = round_name.trim();
      if (round_number !== undefined) updates.round_number = Number(round_number);
      if (description !== undefined) updates.description = description.trim();
      if (is_active !== undefined) updates.is_active = Boolean(is_active);
      if (is_published !== undefined) updates.is_published = Boolean(is_published);

      const updated = db.update('rounds', (r) => r.id === round.id, updates);

      // If round_number changed, sync linked quizzes
      if (round_number !== undefined && Number(round_number) !== Number(round.round_number)) {
        db.update('quizzes', (q) => q.round_id === round.id, {
          round_number: Number(round_number)
        });
      }

      AuditService.log(req.user.id, 'UPDATE_ROUND', 'ROUND', round.id, updates);

      return success(res, updated, 'Round updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete a round
   */
  static async deleteRound(req, res) {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true' || req.body?.force === true;

      const round = db.find('rounds', (r) => r.id === id || String(r.round_number) === String(id));
      if (!round) {
        return error(res, 'Round not found', 404);
      }

      const associatedQuizzes = db.filter(
        'quizzes',
        (q) => q.round_id === round.id || (
          Number(q.round_number) === Number(round.round_number) &&
          (q.event_id === round.event_id || (round.event_name && q.event_name?.toLowerCase() === round.event_name?.toLowerCase()))
        )
      );

      if (associatedQuizzes.length > 0 && !force) {
        return error(
          res,
          `Round ${round.round_number} has ${associatedQuizzes.length} associated quiz(zes). Please confirm force deletion to unassign them.`,
          400,
          { quizzes_count: associatedQuizzes.length }
        );
      }

      if (associatedQuizzes.length > 0 && force) {
        // Unlink associated quizzes and reassign them to Round 1 of that event
        associatedQuizzes.forEach((q) => {
          db.update('quizzes', (qz) => qz.id === q.id, {
            round_id: null,
            round_number: 1
          });
        });
      }

      db.remove('rounds', (r) => r.id === round.id);
      AuditService.log(req.user.id, 'DELETE_ROUND', 'ROUND', round.id, { round_number: round.round_number });

      return success(
        res,
        { deleted_id: round.id, round_number: round.round_number },
        `Round ${round.round_name || round.round_number} deleted successfully`
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Round 1 Leaderboard for Round Selection Panel
   */
  static async getRound1Ranking(req, res) {
    try {
      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1);
      if (!round1Quiz) {
        return error(res, 'Round 1 Quiz not configured yet', 404);
      }

      const results = db.filter('results', (r) => r.quiz_id === round1Quiz.id);
      results.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      const participants = db.get('participants');
      const rankingList = results.map((r) => {
        const p = participants.find((part) => part.id === r.participant_id);
        return {
          participant_id: r.participant_id,
          participant_code: p ? p.participant_id : 'N/A',
          full_name: p ? p.full_name : 'Unknown',
          college: p ? p.college : 'N/A',
          department: p ? p.department : 'N/A',
          score: r.final_score,
          percentage: r.percentage,
          rank: r.rank,
          selected: p ? Boolean(p.round_1_selected) : false,
          attempt_status: r.status
        };
      });

      return success(res, {
        quiz: {
          id: round1Quiz.id,
          title: round1Quiz.title,
          max_marks: round1Quiz.max_marks
        },
        total_participants: rankingList.length,
        selected_count: rankingList.filter((r) => r.selected).length,
        rankings: rankingList
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Auto Select Top N Participants
   */
  static async autoSelectTopN(req, res) {
    try {
      const { top_n = 10, quiz_id } = req.body;
      let targetQuizId = quiz_id;

      if (!targetQuizId) {
        const r1Quiz = db.find('quizzes', (q) => q.round_number === 1);
        if (!r1Quiz) return error(res, 'Round 1 Quiz not found', 404);
        targetQuizId = r1Quiz.id;
      }

      const selected = RoundSelectionService.autoSelectTopN(targetQuizId, Number(top_n), req.user.id);

      AuditService.log(req.user.id, 'AUTO_SELECT_TOP_N', 'ROUND_SELECTION', targetQuizId, {
        top_n: Number(top_n),
        selected_count: selected.filter((s) => s.selected).length
      });

      return success(res, selected, `Successfully selected Top ${top_n} participants for Round 2`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Manually Toggle Individual Selection
   */
  static async toggleParticipantSelection(req, res) {
    try {
      const { participant_id, selected, round_number = 1 } = req.body;
      if (!participant_id) return error(res, 'Participant ID is required', 400);

      const updated = RoundSelectionService.toggleParticipantSelection(
        participant_id,
        Number(round_number),
        Boolean(selected),
        req.user.id
      );

      AuditService.log(req.user.id, 'MANUAL_TOGGLE_ROUND_SELECTION', 'PARTICIPANT', participant_id, {
        selected: Boolean(selected),
        round_number
      });

      return success(res, updated, 'Participant selection status updated');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Publish Round Selection to Participants
   */
  static async publishRoundSelection(req, res) {
    try {
      const { round_number = 1 } = req.body;
      const round = db.find('rounds', (r) => r.round_number === Number(round_number));
      if (round) {
        db.update('rounds', (r) => r.id === round.id, { is_published: true });
      }

      // Auto assign selected participants to Round 2 Quiz
      const round2Quiz = db.find('quizzes', (q) => q.round_number === 2);
      if (round2Quiz) {
        const selectedParticipants = db.filter('participants', (p) => p.round_1_selected);
        selectedParticipants.forEach((p) => {
          const existing = db.find(
            'quiz_assignments',
            (qa) => qa.quiz_id === round2Quiz.id && qa.participant_id === p.id
          );
          if (!existing) {
            db.insert('quiz_assignments', {
              quiz_id: round2Quiz.id,
              participant_id: p.id,
              assigned_by: req.user.id,
              status: 'ASSIGNED'
            });
          }
        });
      }

      // Post Announcement
      db.insert('announcements', {
        title: `Round ${round_number} Official Selection Published!`,
        message: `The official qualifiers list for Round ${Number(round_number) + 1} is now published. Check your dashboard for qualification status.`,
        target_type: 'ALL',
        created_by: req.user.id
      });

      AuditService.log(req.user.id, 'PUBLISH_ROUND_SELECTIONS', 'ROUND', String(round_number));

      return success(res, {}, `Round ${round_number} selections officially published`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Get Participant Round 2 Status & Schedule
   */
  static async getParticipantRoundStatus(req, res) {
    try {
      const participant = db.find('participants', (p) => p.id === req.user.id);
      if (!participant) {
        if (req.user.role === 'ADMIN') {
          return success(res, {
            round_1_selected: true,
            round_1_result: null,
            round_2_quiz: null,
            admin_view: true
          });
        }
        return error(res, 'Participant not found', 404);
      }

      const round1Quiz = db.find('quizzes', (q) => q.round_number === 1);
      const round2Quiz = db.find('quizzes', (q) => q.round_number === 2);

      const r1Result = round1Quiz ? db.find('results', (r) => r.quiz_id === round1Quiz.id && r.participant_id === req.user.id) : null;
      const r2Attempt = round2Quiz ? db.find('exam_attempts', (a) => a.quiz_id === round2Quiz.id && a.participant_id === req.user.id) : null;

      return success(res, {
        round_1_selected: Boolean(participant.round_1_selected),
        round_1_result: r1Result
          ? {
              score: r1Result.final_score,
              rank: r1Result.rank,
              percentage: r1Result.percentage,
              status: r1Result.status
            }
          : null,
        round_2_quiz: round2Quiz
          ? {
              id: round2Quiz.id,
              title: round2Quiz.title,
              start_date: round2Quiz.start_date,
              start_time: round2Quiz.start_time,
              end_date: round2Quiz.end_date,
              end_time: round2Quiz.end_time,
              duration_minutes: round2Quiz.duration_minutes,
              total_questions: round2Quiz.total_questions,
              status: round2Quiz.status,
              attempt_status: r2Attempt ? r2Attempt.status : 'NOT_STARTED'
            }
          : null
      });
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = RoundController;
