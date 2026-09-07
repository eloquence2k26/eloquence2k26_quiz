import { 
  getQuizzesFromDB, 
  registerParticipantForQuiz,
  checkParticipantQuizAccess, 
  startQuizAttempt, 
  saveParticipantAnswer, 
  recordQuizViolation, 
  submitQuizAttempt,
  requestRetest,
  getParticipantQualification,
  getParticipantDashboardStats
} from '../config/db.js';

// GET /api/participant/quizzes - Fetch participant's registered & authorized quizzes
export const getParticipantQuizzes = async (req, res) => {
  try {
    const participantId = req.headers['x-user-id'] || 'user-demo-1';
    const allQuizzes = await getQuizzesFromDB();

    const evaluatedQuizzes = await Promise.all(
      allQuizzes.map(async (q) => {
        const access = await checkParticipantQuizAccess(participantId, q.id);
        return {
          id: q.id,
          title: q.title,
          description: q.description,
          event_id: q.event_id,
          category: q.category,
          start_date_time: q.start_date_time || q.start_time,
          end_date_time: q.end_date_time || q.end_time,
          duration: q.duration,
          max_attempts: q.max_attempts,
          questions_count: (q.questions || []).length,
          total_questions: q.total_questions || (q.questions || []).length,
          marks_per_question: q.marks_per_question || 1,
          instructions: q.instructions || '',
          accessStatus: access.status,
          canStart: access.canStart,
          reason: access.reason,
          approvedRetest: access.approvedRetest || null
        };
      })
    );

    const isUserAdmin = participantId === 'admin_1' || participantId === 'admin@eloquence.com';

    // If student/participant (non-admin), ONLY return the specific quizzes they have been granted access to!
    const filteredQuizzes = isUserAdmin 
      ? evaluatedQuizzes 
      : evaluatedQuizzes.filter((q) => q.accessStatus !== 'not_registered' && q.accessStatus !== 'access_revoked');

    res.json({ quizzes: filteredQuizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/register - Register participant
export const registerParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = req.body.participantId || req.body.userId || req.headers['x-user-id'] || 'user-demo-1';

    const reg = await registerParticipantForQuiz(participantId, id);
    res.status(201).json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/participant/quizzes/:id/check - Check availability
export const checkQuizAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = req.headers['x-user-id'] || 'user-demo-1';
    const access = await checkParticipantQuizAccess(participantId, id);
    res.json(access);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/start - Start quiz attempt
export const startAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const participantId = req.body.participantId || req.body.userId || req.headers['x-user-id'] || 'user-demo-1';

    const attemptData = await startQuizAttempt(participantId, id);
    res.status(201).json({ success: true, ...attemptData });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/answer & /api/participant/attempts/:id/answer
export const saveAnswer = async (req, res) => {
  try {
    const attemptId = req.body.attemptId || req.params.id;
    const questionId = req.body.questionId;
    const selectedAnswer = req.body.selectedAnswer || req.body.selectedOption;

    if (!attemptId || !questionId || !selectedAnswer) {
      return res.status(400).json({ error: 'attemptId, questionId, and selectedAnswer are required' });
    }

    await saveParticipantAnswer(attemptId, questionId, selectedAnswer);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/violation & /api/participant/attempts/:id/violation
export const recordViolation = async (req, res) => {
  try {
    const attemptId = req.body.attemptId || req.params.id;
    const { violationType, details } = req.body;
    const participantId = req.body.participantId || req.body.userId || req.headers['x-user-id'] || 'user-demo-1';

    if (!attemptId || !violationType) {
      return res.status(400).json({ error: 'attemptId and violationType are required' });
    }

    const result = await recordQuizViolation(attemptId, participantId, violationType, details);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/submit & /api/participant/attempts/:id/submit
export const submitAttempt = async (req, res) => {
  try {
    const attemptId = req.body.attemptId || req.params.id;
    const isAutoSubmitted = req.body.isAutoSubmitted;
    const participantId = req.body.participantId || req.body.userId || req.headers['x-user-id'] || 'user-demo-1';

    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }

    const result = await submitQuizAttempt(attemptId, participantId, Boolean(isAutoSubmitted));
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/participant/qualification-status - Check qualification
export const checkQualification = async (req, res) => {
  try {
    const participantId = req.headers['x-user-id'] || 'user-demo-1';
    const status = await getParticipantQualification(participantId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/participant/quizzes/:id/request-retest - Request retest
export const requestRetestPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const participantId = req.body.participantId || req.body.userId || req.headers['x-user-id'] || 'user-demo-1';

    const request = await requestRetest(participantId, id, reason);
    res.json({ success: true, retest: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/participant/stats - Fetch participant's real dashboard stats
export const getParticipantStats = async (req, res) => {
  try {
    const participantId = req.headers['x-user-id'] || 'user-demo-1';
    const stats = await getParticipantDashboardStats(participantId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

