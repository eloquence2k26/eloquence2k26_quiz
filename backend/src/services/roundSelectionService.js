const db = require('../config/db');

class RoundSelectionService {
  /**
   * Formats seconds into human-readable MM:SS string
   */
  static formatTime(seconds) {
    if (!seconds || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Auto-selects participants based on Quiz Results for ANY round (Round 1 -> Round 2, Round 2 -> Round 3, etc.)
   * with support for:
   * - Marks / Cutoff Score
   * - Percentage Cutoff
   * - Time Taken (seconds/tiebreaker)
   * - Top N Count
   * - Automatic assignment of selected scholars to the next round quiz
   */
  static autoSelectCriteria(quizId, { topN, minScore, minPercentage, maxTimeSeconds } = {}, adminId) {
    const quiz = db.find('quizzes', (q) => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    const sourceRoundNumber = Number(quiz.round_number) || 1;
    const targetRoundNumber = sourceRoundNumber + 1;
    const selectionField = `round_${sourceRoundNumber}_selected`;
    const eliminationField = `round_${sourceRoundNumber}_eliminated`;

    const results = db.filter('results', (r) => r.quiz_id === quizId);

    // Primary sort: Score DESC, Percentage DESC, Time Taken ASC (faster = better)
    results.sort((a, b) => {
      if (b.final_score !== a.final_score) {
        return b.final_score - a.final_score;
      }
      if ((b.percentage || 0) !== (a.percentage || 0)) {
        return (b.percentage || 0) - (a.percentage || 0);
      }
      return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
    });

    const parsedMinScore = minScore !== undefined && minScore !== '' && minScore !== null ? Number(minScore) : null;
    const parsedMinPct = minPercentage !== undefined && minPercentage !== '' && minPercentage !== null ? Number(minPercentage) : null;
    const parsedMaxTime = maxTimeSeconds !== undefined && maxTimeSeconds !== '' && maxTimeSeconds !== null ? Number(maxTimeSeconds) : null;
    const parsedTopN = topN !== undefined && topN !== '' && topN !== null ? Number(topN) : null;

    // Find Next Round Quiz for auto-assignment (e.g., Round 2 or Round 3)
    const nextRoundQuiz = db.find(
      'quizzes',
      (q) => Number(q.round_number) === targetRoundNumber && (q.event_id === quiz.event_id || !quiz.event_id)
    ) || db.find('quizzes', (q) => Number(q.round_number) === targetRoundNumber);

    // Reset selection for all participants who took this quiz
    results.forEach((r) => {
      db.update('participants', (p) => p.id === r.participant_id || p.participant_id === r.participant_id, {
        [selectionField]: false,
        [eliminationField]: false
      });

      // Remove unselected participants from next round quiz assignment if previously assigned
      if (nextRoundQuiz) {
        db.remove('quiz_assignments', (qa) => qa.quiz_id === nextRoundQuiz.id && (qa.participant_id === r.participant_id));
      }
    });

    // Determine qualifying candidates matching criteria
    const qualifyingIndices = [];
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      let passes = true;

      if (parsedMinScore !== null && res.final_score < parsedMinScore) {
        passes = false;
      }
      if (parsedMinPct !== null && (res.percentage || 0) < parsedMinPct) {
        passes = false;
      }
      if (parsedMaxTime !== null && (res.time_taken_seconds || 0) > parsedMaxTime) {
        passes = false;
      }

      if (passes) {
        qualifyingIndices.push(i);
      }
    }

    // Apply Top N limit to qualifying candidates
    const selectedIndicesSet = new Set(
      parsedTopN !== null && parsedTopN > 0
        ? qualifyingIndices.slice(0, parsedTopN)
        : qualifyingIndices
    );

    const selectedList = [];

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const isSelected = selectedIndicesSet.has(i);

      db.update('participants', (p) => p.id === res.participant_id || p.participant_id === res.participant_id, {
        [selectionField]: isSelected,
        [eliminationField]: false
      });

      const participant = db.find('participants', (p) => p.id === res.participant_id || p.participant_id === res.participant_id);

      // If selected and Next Round Quiz exists, automatically assign
      if (isSelected && nextRoundQuiz && participant) {
        const existingAssignment = db.find(
          'quiz_assignments',
          (qa) => qa.quiz_id === nextRoundQuiz.id && (qa.participant_id === participant.id || qa.participant_id === res.participant_id)
        );
        if (!existingAssignment) {
          db.insert('quiz_assignments', {
            quiz_id: nextRoundQuiz.id,
            participant_id: participant.id,
            assigned_by: adminId,
            status: 'ASSIGNED'
          });
        }
      }

      // Save to round_selections
      const existing = db.find(
        'round_selections',
        (rs) =>
          rs.event_id === quiz.event_id &&
          Number(rs.round_number) === sourceRoundNumber &&
          (rs.participant_id === res.participant_id || rs.participant_id === participant?.id)
      );

      const selectionPayload = {
        event_id: quiz.event_id || 'c0000000-0000-0000-0000-000000000001',
        round_number: sourceRoundNumber,
        target_round: targetRoundNumber,
        participant_id: participant ? participant.id : res.participant_id,
        score: res.final_score,
        time_taken_seconds: res.time_taken_seconds || 0,
        rank: res.rank || (i + 1),
        selected: isSelected,
        selected_by: adminId,
        published_at: new Date().toISOString()
      };

      if (existing) {
        db.update('round_selections', (rs) => rs.id === existing.id, selectionPayload);
      } else {
        db.insert('round_selections', selectionPayload);
      }

      selectedList.push({
        participant_id: participant ? participant.id : res.participant_id,
        participant_code: participant ? participant.participant_id : 'N/A',
        full_name: participant ? participant.full_name : 'Unknown',
        college: participant ? participant.college : 'N/A',
        department: participant ? participant.department : 'N/A',
        score: res.final_score,
        percentage: res.percentage,
        time_taken_seconds: res.time_taken_seconds || 0,
        time_taken_formatted: this.formatTime(res.time_taken_seconds || 0),
        rank: res.rank || (i + 1),
        selected: isSelected,
        round_number: sourceRoundNumber,
        target_round: targetRoundNumber
      });
    }

    return selectedList;
  }

  /**
   * Backward-compatible autoSelectTopN
   */
  static autoSelectTopN(quizId, topN, adminId) {
    return this.autoSelectCriteria(quizId, { topN }, adminId);
  }

  /**
   * Manually toggles participant selection status for any next round.
   */
  static toggleParticipantSelection(participantId, roundNumber, selected, adminId) {
    const participant = db.find('participants', (p) => p.id === participantId || p.participant_id === participantId);
    if (!participant) throw new Error('Participant not found');

    const sourceRoundNumber = Number(roundNumber) || 1;
    const targetRoundNumber = sourceRoundNumber + 1;
    const updateField = `round_${sourceRoundNumber}_selected`;
    const elimField = `round_${sourceRoundNumber}_eliminated`;

    db.update('participants', (p) => p.id === participant.id, {
      [updateField]: selected,
      [elimField]: false
    });

    // If selected, auto-assign to the target round quiz; if unselected, remove assignment
    const targetRoundQuiz = db.find('quizzes', (q) => Number(q.round_number) === targetRoundNumber);
    if (targetRoundQuiz) {
      if (selected) {
        const existing = db.find(
          'quiz_assignments',
          (qa) => qa.quiz_id === targetRoundQuiz.id && qa.participant_id === participant.id
        );
        if (!existing) {
          db.insert('quiz_assignments', {
            quiz_id: targetRoundQuiz.id,
            participant_id: participant.id,
            assigned_by: adminId,
            status: 'ASSIGNED'
          });
        }
      } else {
        db.remove('quiz_assignments', (qa) => qa.quiz_id === targetRoundQuiz.id && qa.participant_id === participant.id);
      }
    }

    return db.find('participants', (p) => p.id === participant.id);
  }

  /**
   * Validates if a participant is qualified for a given target round (e.g. Round 2, Round 3).
   */
  static isEligibleForRound(participantId, targetRoundNumber = 2) {
    const participant = db.find('participants', (p) => p.id === participantId || p.participant_id === participantId);
    if (!participant) return false;
    const reqField = `round_${targetRoundNumber - 1}_selected`;
    return Boolean(participant[reqField] && !participant.is_disabled && !participant.round_1_eliminated && !participant.round_2_eliminated);
  }

  static isEligibleForRound2(participantId) {
    return this.isEligibleForRound(participantId, 2);
  }
}

module.exports = RoundSelectionService;
