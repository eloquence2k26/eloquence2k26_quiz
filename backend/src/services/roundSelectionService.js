const db = require('../config/db');

class RoundSelectionService {
  /**
   * Auto-selects Top N participants based on Round 1 Quiz Results.
   */
  static autoSelectTopN(quizId, topN, adminId) {
    const quiz = db.find('quizzes', (q) => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    const results = db.filter('results', (r) => r.quiz_id === quizId);
    results.sort((a, b) => {
      if (b.final_score !== a.final_score) {
        return b.final_score - a.final_score;
      }
      return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
    });

    // Reset selection for all participants in this quiz
    results.forEach((r) => {
      db.update('participants', (p) => p.id === r.participant_id, {
        round_1_selected: false
      });
    });

    const selectedList = [];
    const countToSelect = Math.min(topN, results.length);

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const isSelected = i < countToSelect;

      db.update('participants', (p) => p.id === res.participant_id, {
        round_1_selected: isSelected
      });

      const participant = db.find('participants', (p) => p.id === res.participant_id);

      // Save to round_selections
      const existing = db.find(
        'round_selections',
        (rs) => rs.event_id === quiz.event_id && rs.round_number === quiz.round_number && rs.participant_id === res.participant_id
      );

      const selectionPayload = {
        event_id: quiz.event_id,
        round_number: quiz.round_number,
        participant_id: res.participant_id,
        score: res.final_score,
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
        participant_id: res.participant_id,
        full_name: participant ? participant.full_name : 'Unknown',
        college: participant ? participant.college : 'N/A',
        score: res.final_score,
        percentage: res.percentage,
        rank: res.rank || (i + 1),
        selected: isSelected
      });
    }

    return selectedList;
  }

  /**
   * Manually toggles participant selection status for next round.
   */
  static toggleParticipantSelection(participantId, roundNumber, selected, adminId) {
    const participant = db.find('participants', (p) => p.id === participantId);
    if (!participant) throw new Error('Participant not found');

    const updateField = roundNumber === 1 ? 'round_1_selected' : 'round_2_selected';
    db.update('participants', (p) => p.id === participantId, {
      [updateField]: selected
    });

    return db.find('participants', (p) => p.id === participantId);
  }

  /**
   * Validates if a participant is qualified for Round 2.
   */
  static isEligibleForRound2(participantId) {
    const participant = db.find('participants', (p) => p.id === participantId);
    if (!participant) return false;
    return Boolean(participant.round_1_selected && !participant.is_disabled);
  }
}

module.exports = RoundSelectionService;
