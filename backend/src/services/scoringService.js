const db = require('../config/db');

class ScoringService {
  /**
   * Recalculates final score, percentage, passing state and leaderboard rank.
   */
  static calculateAttemptResult(attemptId) {
    const attempt = db.find('exam_attempts', (a) => a.id === attemptId);
    if (!attempt) throw new Error('Attempt not found for scoring');

    const quiz = db.find('quizzes', (q) => q.id === attempt.quiz_id);
    if (!quiz) throw new Error('Quiz not found for attempt');

    let quizQuestions = db.filter('quiz_questions', (qq) => qq.quiz_id === attempt.quiz_id);
    let questionItems = quizQuestions.map((qq) => db.find('questions', (item) => item.id === qq.question_id)).filter(Boolean);
    if (questionItems.length === 0) {
      questionItems = db.filter('questions', (q) => Number(q.round_number) === Number(quiz.round_number));
    }
    const answers = db.filter('attempt_answers', (aa) => aa.attempt_id === attemptId);

    let attemptedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;

    const totalQuestions = questionItems.length;

    questionItems.forEach((q) => {
      if (!q) return;

      const ans = answers.find((a) => a.question_id === q.id);
      const qMarks = Number(q.marks) || 1.0;
      const qNegMarks = quiz.negative_marking ? (Number(quiz.negative_mark_value) || Number(q.negative_marks) || 0.0) : 0.0;

      if (ans && ans.selected_option && ans.selected_option.trim() !== '') {
        attemptedCount += 1;
        const isCorrect = ans.selected_option.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();
        
        // Update individual answer record
        db.update(
          'attempt_answers',
          (a) => a.id === ans.id,
          {
            is_correct: isCorrect,
            marks_awarded: isCorrect ? qMarks : -qNegMarks
          }
        );

        if (isCorrect) {
          correctCount += 1;
          positiveMarks += qMarks;
        } else {
          wrongCount += 1;
          negativeMarks += qNegMarks;
        }
      }
    });

    const unansweredCount = Math.max(0, totalQuestions - attemptedCount);
    const finalScore = Math.max(0, Number((positiveMarks - negativeMarks).toFixed(2)));
    const maxMarks = Number(quiz.max_marks) || (totalQuestions * 2.0);
    const percentage = maxMarks > 0 ? Number(((finalScore / maxMarks) * 100).toFixed(2)) : 0;
    const isPassed = percentage >= (Number(quiz.pass_percentage) || 40);

    let timeTakenSeconds = 0;
    if (attempt.started_at) {
      const endTime = attempt.submitted_at ? new Date(attempt.submitted_at) : new Date();
      timeTakenSeconds = Math.max(0, Math.floor((endTime - new Date(attempt.started_at)) / 1000));
    }

    const resultPayload = {
      attempt_id: attemptId,
      quiz_id: quiz.id,
      participant_id: attempt.participant_id,
      total_questions: totalQuestions,
      attempted_questions: attemptedCount,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered_questions: unansweredCount,
      positive_marks: positiveMarks,
      negative_marks: negativeMarks,
      final_score: finalScore,
      percentage: percentage,
      is_passed: isPassed,
      time_taken_seconds: timeTakenSeconds,
      status: attempt.status,
      published_at: new Date().toISOString()
    };

    const existingResult = db.find('results', (r) => r.attempt_id === attemptId);
    let resultRecord;
    if (existingResult) {
      resultRecord = db.update('results', (r) => r.attempt_id === attemptId, resultPayload);
    } else {
      resultRecord = db.insert('results', resultPayload);
    }

    // Recalculate leaderboard ranks for this quiz
    this.recalculateQuizRanks(quiz.id);

    return db.find('results', (r) => r.attempt_id === attemptId);
  }

  static recalculateQuizRanks(quizId) {
    const allResults = db.filter('results', (r) => r.quiz_id === quizId);
    allResults.sort((a, b) => {
      if (b.final_score !== a.final_score) {
        return b.final_score - a.final_score;
      }
      return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
    });

    let currentRank = 1;
    allResults.forEach((res, index) => {
      if (index > 0) {
        const prev = allResults[index - 1];
        if (prev.final_score === res.final_score && prev.time_taken_seconds === res.time_taken_seconds) {
          res.rank = prev.rank;
        } else {
          res.rank = index + 1;
        }
      } else {
        res.rank = 1;
      }
      db.update('results', (r) => r.id === res.id, { rank: res.rank });
    });
  }
}

module.exports = ScoringService;
