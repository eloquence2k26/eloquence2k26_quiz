import { 
  getQuizzesFromDB, 
  insertQuizToDB, 
  updateQuizInDB, 
  deleteQuizFromDB, 
  addQuestionToQuizInDB, 
  updateQuestionInQuizInDB, 
  deleteQuestionFromQuizInDB,
  getQuizRegistrations,
  grantParticipantAccess,
  revokeParticipantAccess,
  setParticipantAccessByQuizAndUser,
  getRetestRequests,
  grantRetest,
  revokeRetest,
  getAllResults,
  getAllViolations,
  getQuizSubmissions,
  filterAndQualifyNextRound,
  toggleParticipantQualification,
  insertUserToDB
} from '../config/db.js';

// GET /api/admin/quizzes - List all event quizzes
export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await getQuizzesFromDB();
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes - Create new Quiz Event
export const createQuiz = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      event_id, 
      category, 
      start_date_time, 
      end_date_time, 
      duration, 
      max_participants,
      total_questions,
      number_of_questions,
      marks_per_question,
      negative_marking,
      negative_marks_value,
      status,
      instructions,
      max_attempts, 
      strict_mode,
      fullscreen_required,
      detect_visibility_change,
      detect_tab_switch,
      detect_focus_loss,
      detect_fullscreen_exit,
      max_violations,
      violation_action,
      show_score,
      show_correct_answers,
      show_ranking,
      allow_retest
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }

    const newQuiz = await insertQuizToDB({
      title,
      description,
      event_id: event_id || 'evt_eloquence_2026',
      category: category || 'General Technology',
      start_date_time: start_date_time || req.body.start_time,
      end_date_time: end_date_time || req.body.end_time,
      duration: duration || 30,
      max_participants: max_participants || 100,
      total_questions: total_questions || number_of_questions || 30,
      marks_per_question: marks_per_question || 1,
      negative_marking: Boolean(negative_marking),
      negative_marks_value: negative_marks_value || 0,
      status: status || 'Published',
      instructions: instructions || '',
      max_attempts: max_attempts || 1,
      strict_mode: strict_mode ?? true,
      fullscreen_required: fullscreen_required ?? true,
      detect_visibility_change: detect_visibility_change ?? true,
      detect_tab_switch: detect_tab_switch ?? true,
      detect_focus_loss: detect_focus_loss ?? true,
      detect_fullscreen_exit: detect_fullscreen_exit ?? true,
      max_violations: max_violations || 3,
      violation_action: violation_action || 'lock',
      show_score: show_score ?? true,
      show_correct_answers: show_correct_answers ?? false,
      show_ranking: show_ranking ?? false,
      allow_retest: allow_retest ?? true
    });

    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/quizzes/:id - Update Quiz Event
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedQuiz = await updateQuizInDB(id, req.body);
    if (updatedQuiz) {
      return res.json({ success: true, quiz: updatedQuiz });
    }
    res.status(404).json({ error: 'Quiz not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/quizzes/:id - Delete Quiz Event
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQuizFromDB(id);
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/quizzes/:id/questions - Fetch questions for quiz
export const getQuestionsForQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quizzes = await getQuizzesFromDB();
    const quiz = quizzes.find((q) => String(q.id) === String(id));
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ questions: quiz.questions || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:id/questions - Add question inside quiz
export const addQuestionToQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      prompt, 
      questionText, 
      question,
      optionA, 
      optionB, 
      optionC, 
      optionD, 
      optionsCount,
      correct_answer, 
      correctOption, 
      correct_option, 
      marks, 
      negative_marks, 
      negativeMarks,
      image_url, 
      question_image,
      explanation,
      question_order 
    } = req.body;

    const finalPrompt = prompt || questionText || question;
    if (!finalPrompt || !optionA || !optionB) {
      return res.status(400).json({ error: 'Question prompt and at least 2 options are required' });
    }

    const result = await addQuestionToQuizInDB(id, {
      prompt: finalPrompt,
      optionA,
      optionB,
      optionC,
      optionD,
      optionsCount: optionsCount || (optionD ? 4 : (optionC ? 3 : 2)),
      correct_answer: correct_answer || correctOption || correct_option || 'A',
      marks: marks || 1,
      negative_marks: negative_marks || negativeMarks || 0,
      question_image: question_image || image_url || '',
      explanation: explanation || '',
      question_order: question_order || 1
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/quizzes/:id/questions/:qId - Update question inside quiz
export const updateQuestionInQuiz = async (req, res) => {
  try {
    const { id, qId } = req.params;
    const updatedQuiz = await updateQuestionInQuizInDB(id, qId, req.body);
    res.json({ success: true, quiz: updatedQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/quizzes/:id/questions/:qId - Delete question from quiz
export const deleteQuestionFromQuiz = async (req, res) => {
  try {
    const { id, qId } = req.params;
    const updatedQuiz = await deleteQuestionFromQuizInDB(id, qId);
    res.json({ success: true, quiz: updatedQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/quizzes/:quizId/registrations - Get registrations
export const getRegistrations = async (req, res) => {
  try {
    const { quizId } = req.params;
    const registrations = await getQuizRegistrations(quizId);
    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/registrations/:id/grant-access - Grant Quiz Access
export const grantAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const reg = await grantParticipantAccess(id);
    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/admin/registrations/:id/revoke-access - Revoke Quiz Access
export const revokeAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const reg = await revokeParticipantAccess(id);
    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:quizId/access - Toggle access status directly
export const toggleAccessDirect = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { participantId, accessStatus } = req.body;
    if (!participantId || !accessStatus) {
      return res.status(400).json({ error: 'participantId and accessStatus are required' });
    }
    const reg = await setParticipantAccessByQuizAndUser(quizId, participantId, accessStatus);
    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/results - Get overall attempt scores
export const getResults = async (req, res) => {
  try {
    const results = await getAllResults();
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/violations - Get anti-cheating violation logs
export const getViolations = async (req, res) => {
  try {
    const violations = await getAllViolations();
    res.json({ violations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/retests - Get all retest requests
export const getRetests = async (req, res) => {
  try {
    const retests = await getRetestRequests();
    res.json({ retests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/attempts/:id/grant-retest - Grant retest permission
export const grantRetestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { quizId, adminMessage } = req.body;
    const retest = await grantRetest(id, quizId, adminMessage);
    res.json({ success: true, retest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/attempts/:id/revoke-retest - Revoke retest permission
export const revokeRetestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { quizId } = req.body;
    const retest = await revokeRetest(id, quizId);
    res.json({ success: true, retest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Legacy approve/reject retest
export const approveRetestLegacy = async (req, res) => {
  try {
    const { requestId, quizId, adminMessage } = req.body;
    const retest = await grantRetest(requestId, quizId, adminMessage);
    res.json({ success: true, retest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectRetestLegacy = async (req, res) => {
  try {
    const { requestId, quizId } = req.body;
    const retest = await revokeRetest(requestId, quizId);
    res.json({ success: true, retest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/quizzes/:quizId/submissions - Fetch submissions
export const getSubmissions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const submissions = await getQuizSubmissions(quizId);
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:quizId/qualify-next-round - Qualify top N performers
export const qualifyNextRound = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { topCount, nextRoundQuizId } = req.body;

    const result = await filterAndQualifyNextRound(quizId, topCount || 5, nextRoundQuizId || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:id/questions/bulk - Bulk add questions inside quiz
export const bulkAddQuestionsToQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const questions = req.body.questions || req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions list array is required' });
    }

    const added = [];
    for (const q of questions) {
      const finalPrompt = q.prompt || q.questionText || q.question;
      if (finalPrompt && (q.optionA || q.option_a) && (q.optionB || q.option_b)) {
        const result = await addQuestionToQuizInDB(id, {
          prompt: finalPrompt,
          optionA: q.optionA || q.option_a,
          optionB: q.optionB || q.option_b,
          optionC: q.optionC || q.option_c || '',
          optionD: q.optionD || q.option_d || '',
          optionsCount: q.optionsCount || q.options_count || (q.optionD || q.option_d ? 4 : (q.optionC || q.option_c ? 3 : 2)),
          correct_answer: (q.correct_answer || q.correctOption || q.correct_option || 'A').toUpperCase(),
          marks: parseFloat(q.marks) || 1,
          negative_marks: parseFloat(q.negative_marks || q.negativeMarks) || 0,
          question_image: q.question_image || q.image_url || '',
          explanation: q.explanation || '',
          question_order: parseInt(q.question_order, 10) || (added.length + 1)
        });
        added.push(result);
      }
    }

    res.status(201).json({ success: true, count: added.length, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:quizId/toggle-qualification - Toggle qualification
export const toggleQualification = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { participantId, newQualificationStatus, nextRoundQuizId } = req.body;

    if (!participantId || !newQualificationStatus) {
      return res.status(400).json({ error: 'participantId and newQualificationStatus are required' });
    }

    const result = await toggleParticipantQualification(quizId, participantId, newQualificationStatus, nextRoundQuizId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/quizzes/:quizId/upload-participants - Bulk upload participant access
export const bulkUploadParticipantsToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const students = req.body.students || req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Students list array is required' });
    }

    const registered = [];
    for (const s of students) {
      if (s.email || s.phone || s.name) {
        const email = s.email || `${(s.name || 'student').toLowerCase().replace(/[^a-z0-9]/g, '')}@eloquence.com`;
        const phone = s.phone || '0000000000';
        const userId = s.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

        const userObj = {
          id: userId,
          name: s.name || 'Student Participant',
          email,
          phone,
          password: s.password || (phone.replace(/\D/g, '').substring(0, 4) || '1234'),
          role: s.role || 'user',
          status: 'Active',
          created_at: new Date().toISOString()
        };

        await insertUserToDB(userObj);

        // Register and grant access for both user ID and email
        const reg1 = await setParticipantAccessByQuizAndUser(quizId, userObj.id, 'Granted');
        const reg2 = await setParticipantAccessByQuizAndUser(quizId, userObj.email, 'Granted');
        registered.push({ user: userObj, reg: reg1 });
      }
    }

    res.status(201).json({ success: true, count: registered.length, registered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


