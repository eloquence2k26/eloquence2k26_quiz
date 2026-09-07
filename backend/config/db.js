import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const USERS_DB_FILE = path.join(DATA_DIR, 'users.json');
const QUIZZES_DB_FILE = path.join(DATA_DIR, 'quizzes.json');
const REGISTRATIONS_DB_FILE = path.join(DATA_DIR, 'registrations.json');
const ATTEMPTS_DB_FILE = path.join(DATA_DIR, 'attempts.json');
const VIOLATIONS_DB_FILE = path.join(DATA_DIR, 'violations.json');
const RETESTS_DB_FILE = path.join(DATA_DIR, 'retests.json');

// Helper to safely load JSON file
const loadFile = (filePath, fallback = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
};

// Helper to safely save JSON file
const saveFile = (filePath, data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
    return false;
  }
};

// Empty Initial Data - All records managed live via Supabase DB only
const initialQuizzes = [];
const initialRegistrations = [];

// Initialize files
loadFile(USERS_DB_FILE, []);
loadFile(QUIZZES_DB_FILE, []);
loadFile(REGISTRATIONS_DB_FILE, []);
loadFile(ATTEMPTS_DB_FILE, []);
loadFile(VIOLATIONS_DB_FILE, []);
loadFile(RETESTS_DB_FILE, []);

/* ================= USERS MANAGEMENT ================= */

export const loadLocalUsers = () => loadFile(USERS_DB_FILE, []);
export const saveLocalUsers = (users) => saveFile(USERS_DB_FILE, users);

let isUsersSyncing = false;
const triggerUsersBackgroundSync = () => {
  if (!supabase || isUsersSyncing) return;
  isUsersSyncing = true;
  supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      isUsersSyncing = false;
      if (!error && Array.isArray(data) && data.length > 0) {
        saveLocalUsers(data);
      }
    })
    .catch(() => {
      isUsersSyncing = false;
    });
};

export const getUsersFromDB = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        saveLocalUsers(data);
        return data;
      }
      if (error) {
        console.warn('Supabase getUsersFromDB error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase getUsersFromDB exception:', err.message);
    }
  }
  return loadLocalUsers();
};

export const insertUserToDB = async (userObj) => {
  const currentUsers = loadLocalUsers();
  const updated = [userObj, ...currentUsers.filter((u) => String(u.id) !== String(userObj.id))];
  saveLocalUsers(updated);

  if (supabase) {
    try {
      const { error } = await supabase.from('users').upsert([userObj], { onConflict: 'id' });
      if (error) {
        console.error('Supabase insertUserToDB error:', error.message);
      }
    } catch (err) {
      console.error('Supabase insertUserToDB exception:', err.message);
    }
  }
  return userObj;
};

export const bulkInsertUsersToDB = async (userList) => {
  const currentUsers = loadLocalUsers();
  const newMap = new Map();
  userList.forEach((u) => newMap.set(u.id || u.email || u.phone, u));
  currentUsers.forEach((u) => {
    if (!newMap.has(u.id || u.email || u.phone)) {
      newMap.set(u.id || u.email || u.phone, u);
    }
  });

  const merged = Array.from(newMap.values());
  saveLocalUsers(merged);

  if (supabase) {
    try {
      const { error } = await supabase.from('users').upsert(userList, { onConflict: 'id' });
      if (error) {
        console.error('Supabase bulkInsertUsersToDB error:', error.message);
      }
    } catch (err) {
      console.error('Supabase bulkInsertUsersToDB exception:', err.message);
    }
  }
  return merged;
};

export const updateUserInDB = async (id, updates) => {
  const currentUsers = loadLocalUsers();
  let updatedUser = null;

  const newUsers = currentUsers.map((u) => {
    if (String(u.id) === String(id)) {
      updatedUser = { ...u, ...updates };
      return updatedUser;
    }
    return u;
  });

  saveLocalUsers(newUsers);

  if (supabase && updatedUser) {
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) {
        console.error('Supabase updateUserInDB error:', error.message);
      }
    } catch (err) {
      console.error('Supabase updateUserInDB exception:', err.message);
    }
  }
  return updatedUser;
};

export const deleteUserFromDB = async (id) => {
  const currentUsers = loadLocalUsers();
  const newUsers = currentUsers.filter((u) => String(u.id) !== String(id));
  saveLocalUsers(newUsers);

  if (supabase) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteUserFromDB error:', error.message);
      }
    } catch (err) {
      console.error('Supabase deleteUserFromDB exception:', err.message);
    }
  }
  return true;
};

/* ================= QUIZZES & QUESTIONS MANAGEMENT ================= */

export const loadLocalQuizzes = () => loadFile(QUIZZES_DB_FILE, initialQuizzes);
export const saveLocalQuizzes = (quizzes) => saveFile(QUIZZES_DB_FILE, quizzes);

export const getQuizzesFromDB = async () => {
  if (supabase) {
    try {
      const { data: quizzesData, error: qErr } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      const { data: questionsData, error: qnErr } = await supabase.from('quiz_questions').select('*').order('question_order', { ascending: true });

      if (!qErr && Array.isArray(quizzesData) && quizzesData.length > 0) {
        const questionsMap = {};
        (questionsData || []).forEach((qn) => {
          if (!questionsMap[qn.quiz_id]) questionsMap[qn.quiz_id] = [];
          questionsMap[qn.quiz_id].push({
            ...qn,
            optionA: qn.option_a || qn.optionA,
            optionB: qn.option_b || qn.optionB,
            optionC: qn.option_c || qn.optionC,
            optionD: qn.option_d || qn.optionD,
            optionsCount: qn.options_count || qn.optionsCount || 4
          });
        });

        const fullQuizzes = quizzesData.map((q) => ({
          ...q,
          questions: questionsMap[q.id] || []
        }));
        saveLocalQuizzes(fullQuizzes);
        return fullQuizzes;
      }
    } catch (e) {
      console.warn('Supabase getQuizzesFromDB warning:', e.message);
    }
  }
  return loadLocalQuizzes();
};

export const insertQuizToDB = async (quizObj) => {
  const currentQuizzes = loadLocalQuizzes();
  const newQuiz = {
    id: quizObj.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    title: quizObj.title || 'Untitled Symposium Quiz',
    description: quizObj.description || '',
    event_id: quizObj.event_id || 'evt_eloquence_2026',
    category: quizObj.category || 'General Technology',
    start_date_time: quizObj.start_date_time || quizObj.start_time || new Date().toISOString(),
    end_date_time: quizObj.end_date_time || quizObj.end_time || new Date(Date.now() + 86400000).toISOString(),
    duration: parseInt(quizObj.duration, 10) || 30,
    max_participants: parseInt(quizObj.max_participants, 10) || 100,
    total_questions: parseInt(quizObj.total_questions || quizObj.number_of_questions, 10) || 30,
    marks_per_question: parseFloat(quizObj.marks_per_question) || 1,
    negative_marking: Boolean(quizObj.negative_marking),
    negative_marks_value: parseFloat(quizObj.negative_marks_value) || 0,
    status: quizObj.status || 'Published',
    instructions: quizObj.instructions || '',
    max_attempts: parseInt(quizObj.max_attempts, 10) || 1,
    strict_mode: quizObj.strict_mode ?? true,
    fullscreen_required: quizObj.fullscreen_required ?? true,
    detect_visibility_change: quizObj.detect_visibility_change ?? true,
    detect_tab_switch: quizObj.detect_tab_switch ?? true,
    detect_focus_loss: quizObj.detect_focus_loss ?? true,
    detect_fullscreen_exit: quizObj.detect_fullscreen_exit ?? true,
    max_violations: parseInt(quizObj.max_violations, 10) || 3,
    violation_action: quizObj.violation_action || 'lock',
    show_score: quizObj.show_score ?? true,
    show_correct_answers: quizObj.show_correct_answers ?? false,
    show_ranking: quizObj.show_ranking ?? false,
    allow_retest: quizObj.allow_retest ?? true,
    created_by: quizObj.created_by || 'admin',
    created_at: new Date().toISOString(),
    questions: quizObj.questions || []
  };

  const updated = [newQuiz, ...currentQuizzes];
  saveLocalQuizzes(updated);

  if (supabase) {
    const { questions, ...dbQuiz } = newQuiz;
    supabase.from('quizzes').upsert([dbQuiz]).then().catch((e) => console.warn('Supabase insert quiz warning:', e.message));
  }

  return newQuiz;
};

export const updateQuizInDB = async (id, updates) => {
  const currentQuizzes = loadLocalQuizzes();
  let updatedQuiz = null;

  const newQuizzes = currentQuizzes.map((q) => {
    if (String(q.id) === String(id)) {
      updatedQuiz = { ...q, ...updates };
      return updatedQuiz;
    }
    return q;
  });

  saveLocalQuizzes(newQuizzes);

  if (supabase && updatedQuiz) {
    const { questions, ...dbQuiz } = updatedQuiz;
    supabase.from('quizzes').update(dbQuiz).eq('id', id).then().catch((e) => console.warn('Supabase update quiz warning:', e.message));
  }

  return updatedQuiz;
};

export const updateQuizScheduleInDB = async (id, startTime, endTime) => {
  return updateQuizInDB(id, { 
    start_date_time: startTime, 
    end_date_time: endTime,
    start_time: startTime,
    end_time: endTime
  });
};

export const deleteQuizFromDB = async (id) => {
  const currentQuizzes = loadLocalQuizzes();
  const newQuizzes = currentQuizzes.filter((q) => String(q.id) !== String(id));
  saveLocalQuizzes(newQuizzes);

  // Clean up registrations
  const currentRegs = loadRegistrations();
  saveRegistrations(currentRegs.filter((r) => String(r.quiz_id) !== String(id)));

  if (supabase) {
    supabase.from('quizzes').delete().eq('id', id).then().catch((e) => console.warn('Supabase delete quiz warning:', e.message));
  }

  return true;
};

// Question Management inside Quiz ONLY
export const addQuestionToQuizInDB = async (quizId, questionObj) => {
  const currentQuizzes = loadLocalQuizzes();
  let updatedQuiz = null;

  const optionsCount = parseInt(questionObj.optionsCount || questionObj.options_count, 10) || 4;

  const newQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    quiz_id: quizId,
    prompt: questionObj.prompt || questionObj.questionText || questionObj.question,
    optionA: questionObj.optionA || questionObj.option_a || '',
    optionB: questionObj.optionB || questionObj.option_b || '',
    optionC: optionsCount >= 3 ? (questionObj.optionC || questionObj.option_c || '') : '',
    optionD: optionsCount >= 4 ? (questionObj.optionD || questionObj.option_d || '') : '',
    options_count: optionsCount,
    correct_answer: (questionObj.correct_answer || questionObj.correctOption || questionObj.correct_option || 'A').toUpperCase(),
    marks: parseFloat(questionObj.marks) || 1,
    negative_marks: parseFloat(questionObj.negative_marks || questionObj.negativeMarks) || 0,
    question_image: questionObj.question_image || questionObj.image_url || '',
    explanation: questionObj.explanation || '',
    question_order: parseInt(questionObj.question_order, 10) || 1,
    created_at: new Date().toISOString()
  };

  const newQuizzes = currentQuizzes.map((q) => {
    if (String(q.id) === String(quizId)) {
      const questions = q.questions || [];
      updatedQuiz = {
        ...q,
        questions: [...questions, newQuestion],
        total_questions: questions.length + 1
      };
      return updatedQuiz;
    }
    return q;
  });

  saveLocalQuizzes(newQuizzes);

  if (supabase) {
    const dbQn = {
      id: newQuestion.id,
      quiz_id: newQuestion.quiz_id,
      prompt: newQuestion.prompt,
      option_a: newQuestion.optionA,
      option_b: newQuestion.optionB,
      option_c: newQuestion.optionC,
      option_d: newQuestion.optionD,
      options_count: newQuestion.options_count,
      correct_answer: newQuestion.correct_answer,
      marks: newQuestion.marks,
      negative_marks: newQuestion.negative_marks,
      question_image: newQuestion.question_image,
      explanation: newQuestion.explanation,
      question_order: newQuestion.question_order,
      created_at: newQuestion.created_at
    };
    supabase.from('quiz_questions').insert([dbQn]).then().catch((e) => console.warn('Supabase insert question warning:', e.message));
  }

  return { quiz: updatedQuiz, question: newQuestion };
};

export const updateQuestionInQuizInDB = async (quizId, questionId, updates) => {
  const currentQuizzes = loadLocalQuizzes();
  let updatedQuiz = null;
  let updatedQn = null;

  const newQuizzes = currentQuizzes.map((q) => {
    if (String(q.id) === String(quizId)) {
      const questions = (q.questions || []).map((qn) => {
        if (String(qn.id) === String(questionId)) {
          updatedQn = { ...qn, ...updates };
          if (updates.correctOption) updatedQn.correct_answer = updates.correctOption.toUpperCase();
          if (updates.correct_option) updatedQn.correct_answer = updates.correct_option.toUpperCase();
          return updatedQn;
        }
        return qn;
      });
      updatedQuiz = { ...q, questions };
      return updatedQuiz;
    }
    return q;
  });

  saveLocalQuizzes(newQuizzes);

  if (supabase && updatedQn) {
    const dbQn = {
      prompt: updatedQn.prompt,
      option_a: updatedQn.optionA || updatedQn.option_a,
      option_b: updatedQn.optionB || updatedQn.option_b,
      option_c: updatedQn.optionC || updatedQn.option_c,
      option_d: updatedQn.optionD || updatedQn.option_d,
      options_count: updatedQn.options_count || updatedQn.optionsCount,
      correct_answer: updatedQn.correct_answer,
      marks: updatedQn.marks,
      negative_marks: updatedQn.negative_marks,
      question_image: updatedQn.question_image,
      explanation: updatedQn.explanation
    };
    supabase.from('quiz_questions').update(dbQn).eq('id', questionId).then().catch((e) => console.warn('Supabase update question warning:', e.message));
  }

  return updatedQuiz;
};

export const deleteQuestionFromQuizInDB = async (quizId, questionId) => {
  const currentQuizzes = loadLocalQuizzes();
  let updatedQuiz = null;

  const newQuizzes = currentQuizzes.map((q) => {
    if (String(q.id) === String(quizId)) {
      const questions = (q.questions || []).filter((qn) => String(qn.id) !== String(questionId));
      updatedQuiz = { ...q, questions, total_questions: questions.length };
      return updatedQuiz;
    }
    return q;
  });

  saveLocalQuizzes(newQuizzes);

  if (supabase) {
    supabase.from('quiz_questions').delete().eq('id', questionId).then().catch((e) => console.warn('Supabase delete question warning:', e.message));
  }

  return updatedQuiz;
};

/* ================= PARTICIPANT REGISTRATIONS & ACCESS CONTROL ================= */

export const loadRegistrations = () => loadFile(REGISTRATIONS_DB_FILE, initialRegistrations);
export const saveRegistrations = (regs) => saveFile(REGISTRATIONS_DB_FILE, regs);

export const registerParticipantForQuiz = (participantId, quizId) => {
  const regs = loadRegistrations();
  let existing = regs.find((r) => String(r.participant_id) === String(participantId) && String(r.quiz_id) === String(quizId));

  if (!existing) {
    existing = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      quiz_id: quizId,
      participant_id: participantId,
      registration_status: 'Approved',
      access_status: 'Granted', // Default to Granted on registration
      registered_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };
    regs.unshift(existing);
    saveRegistrations(regs);
  }

  if (supabase && existing) {
    supabase.from('quiz_registrations').upsert([{
      id: existing.id,
      quiz_id: existing.quiz_id,
      participant_id: existing.participant_id,
      registration_status: existing.registration_status,
      access_status: existing.access_status,
      registered_at: existing.registered_at,
      approved_at: existing.approved_at
    }], { onConflict: 'id' }).then().catch((e) => console.warn('Supabase upsert registration warning:', e.message));
  }

  return existing;
};

export const getQuizRegistrations = (quizId) => {
  const regs = loadRegistrations().filter((r) => String(r.quiz_id) === String(quizId));
  const users = loadLocalUsers();

  return regs.map((r) => {
    const userObj = users.find((u) => String(u.id) === String(r.participant_id) || String(u.email) === String(r.participant_id));
    return {
      ...r,
      participantName: userObj ? userObj.name : (r.participant_id === 'admin_1' ? 'Administrator' : 'Student Participant'),
      participantEmail: userObj ? userObj.email : r.participant_id,
      participantPhone: userObj ? userObj.phone : ''
    };
  });
};

export const grantParticipantAccess = (registrationIdOrQuizUserId) => {
  const regs = loadRegistrations();
  const reg = regs.find((r) => String(r.id) === String(registrationIdOrQuizUserId) || String(r.participant_id) === String(registrationIdOrQuizUserId));

  if (!reg) throw new Error('Registration record not found');
  reg.access_status = 'Granted';
  reg.approved_at = new Date().toISOString();
  saveRegistrations(regs);

  if (supabase) {
    supabase.from('quiz_registrations').update({ access_status: 'Granted', approved_at: reg.approved_at }).eq('id', reg.id).then().catch((e) => console.warn('Supabase grant access warning:', e.message));
  }

  return reg;
};

export const revokeParticipantAccess = (registrationIdOrQuizUserId) => {
  const regs = loadRegistrations();
  const reg = regs.find((r) => String(r.id) === String(registrationIdOrQuizUserId) || String(r.participant_id) === String(registrationIdOrQuizUserId));

  if (!reg) throw new Error('Registration record not found');
  reg.access_status = 'Revoked';
  saveRegistrations(regs);

  if (supabase) {
    supabase.from('quiz_registrations').update({ access_status: 'Revoked' }).eq('id', reg.id).then().catch((e) => console.warn('Supabase revoke access warning:', e.message));
  }

  return reg;
};

export const setParticipantAccessByQuizAndUser = (quizId, participantId, accessStatus) => {
  const regs = loadRegistrations();
  let reg = regs.find((r) => String(r.quiz_id) === String(quizId) && String(r.participant_id) === String(participantId));

  if (!reg) {
    reg = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      quiz_id: quizId,
      participant_id: participantId,
      registration_status: 'Approved',
      access_status: accessStatus,
      registered_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };
    regs.unshift(reg);
  } else {
    reg.access_status = accessStatus;
  }

  saveRegistrations(regs);

  if (supabase) {
    supabase.from('quiz_registrations').upsert([{
      id: reg.id,
      quiz_id: reg.quiz_id,
      participant_id: reg.participant_id,
      registration_status: reg.registration_status,
      access_status: reg.access_status,
      registered_at: reg.registered_at,
      approved_at: reg.approved_at
    }], { onConflict: 'id' }).then().catch((e) => console.warn('Supabase set access warning:', e.message));
  }

  return reg;
};

/* ================= PARTICIPANT QUIZ ACCESS & ATTEMPTS ================= */

export const loadAttempts = () => loadFile(ATTEMPTS_DB_FILE, []);
export const saveAttempts = (attempts) => saveFile(ATTEMPTS_DB_FILE, attempts);

export const loadViolations = () => loadFile(VIOLATIONS_DB_FILE, []);
export const saveViolations = (violations) => saveFile(VIOLATIONS_DB_FILE, violations);

export const loadRetests = () => loadFile(RETESTS_DB_FILE, []);
export const saveRetests = (retests) => saveFile(RETESTS_DB_FILE, retests);

/**
 * Server-Enforced Availability Check for Participant
 */
export const checkParticipantQuizAccess = async (participantId, quizId) => {
  const quizzes = loadLocalQuizzes();
  const quiz = quizzes.find((q) => String(q.id) === String(quizId));

  if (!quiz) {
    return { canStart: false, status: 'not_found', reason: 'Quiz not found' };
  }

  // 1. Registration & Access Verification
  const regs = loadRegistrations();
  const users = loadLocalUsers();
  const matchedUser = users.find((u) => 
    String(u.id) === String(participantId) || 
    String(u.email).toLowerCase() === String(participantId).toLowerCase() || 
    String(u.phone) === String(participantId)
  );

  const reg = regs.find((r) => 
    String(r.quiz_id) === String(quizId) && 
    (String(r.participant_id) === String(participantId) || 
     (matchedUser && (String(r.participant_id) === String(matchedUser.id) || String(r.participant_id).toLowerCase() === String(matchedUser.email).toLowerCase())))
  );

  // If user is admin, allow access
  const isUserAdmin = participantId === 'admin_1' || participantId === 'admin@eloquence.com';

  if (!reg && !isUserAdmin) {
    return {
      canStart: false,
      status: 'not_registered',
      reason: 'You are not registered for this quiz event.',
      quizTitle: quiz.title
    };
  }

  if (reg && reg.access_status === 'Revoked' && !isUserAdmin) {
    return {
      canStart: false,
      status: 'access_revoked',
      reason: 'Access to this quiz has been revoked by the administrator.',
      quizTitle: quiz.title
    };
  }

  // 2. Schedule Timing Verification
  const now = new Date();
  const start = new Date(quiz.start_date_time || quiz.start_time);
  const end = new Date(quiz.end_date_time || quiz.end_time);

  if (now < start) {
    return { 
      canStart: false, 
      status: 'upcoming', 
      reason: `Quiz Not Started. This quiz will start at: ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please wait.`,
      startTime: start.toISOString(),
      formattedStartTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quizTitle: quiz.title
    };
  }

  if (now > end) {
    return {
      canStart: false,
      status: 'closed',
      reason: 'Quiz event schedule window has closed.',
      quizTitle: quiz.title
    };
  }

  // 3. Attempt Limit & Approved Retests Verification
  const attempts = loadAttempts().filter((a) => String(a.participant_id) === String(participantId) && String(a.quiz_id) === String(quizId));
  const approvedRetest = loadRetests().find((r) => String(r.participant_id) === String(participantId) && String(r.quiz_id) === String(quizId) && r.status === 'granted');

  const maxAllowedAttempts = (quiz.max_attempts || 1) + (approvedRetest ? 1 : 0);

  if (attempts.length >= maxAllowedAttempts) {
    const isTerminated = attempts.some((a) => a.status === 'TERMINATED' || a.status === 'locked');
    return {
      canStart: false,
      status: isTerminated ? 'terminated' : 'completed',
      reason: isTerminated 
        ? 'Your previous quiz attempt was terminated due to security violations. Retest permission is required from administrator.'
        : 'You have already used your allowed attempt for this quiz.',
      approvedRetest: approvedRetest || null,
      quizTitle: quiz.title
    };
  }

  return { 
    canStart: true, 
    status: 'granted', 
    quiz, 
    attemptNumber: attempts.length + 1,
    approvedRetest: approvedRetest || null,
    quizTitle: quiz.title
  };
};

/**
 * Server-Authoritative Quiz Attempt Start
 * SANITIZES QUESTIONS: Correct answer is strictly stripped out before returning to frontend!
 */
export const startQuizAttempt = async (participantId, quizId) => {
  const check = await checkParticipantQuizAccess(participantId, quizId);
  if (!check.canStart) {
    throw new Error(check.reason);
  }

  const quiz = check.quiz;
  const attempts = loadAttempts();

  const newAttempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    quiz_id: quiz.id,
    participant_id: participantId,
    attempt_number: check.attemptNumber,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString(),
    submitted_at: null,
    score: 0,
    total_marks: (quiz.questions || []).reduce((acc, q) => acc + (parseFloat(q.marks) || 1), 0),
    violations_count: 0,
    answers: {}
  };

  attempts.unshift(newAttempt);
  saveAttempts(attempts);

  // SANITIZE QUESTIONS: Keep correct answer hidden on server!
  const sanitizedQuestions = (quiz.questions || []).map((q, idx) => ({
    id: q.id,
    prompt: q.prompt,
    optionA: q.optionA || q.option_a,
    optionB: q.optionB || q.option_b,
    optionC: q.optionC || q.option_c || '',
    optionD: q.optionD || q.option_d || '',
    optionsCount: q.options_count || 4,
    marks: q.marks || 1,
    negative_marks: q.negative_marks || 0,
    question_image: q.question_image || q.image_url || '',
    question_order: q.question_order || (idx + 1)
  }));

  return {
    attemptId: newAttempt.id,
    quizTitle: quiz.title,
    instructions: quiz.instructions,
    durationMinutes: quiz.duration || 30,
    startedAt: newAttempt.started_at,
    securitySettings: {
      strict_mode: quiz.strict_mode ?? true,
      fullscreen_required: quiz.fullscreen_required ?? true,
      detect_visibility_change: quiz.detect_visibility_change ?? true,
      detect_tab_switch: quiz.detect_tab_switch ?? true,
      detect_focus_loss: quiz.detect_focus_loss ?? true,
      detect_fullscreen_exit: quiz.detect_fullscreen_exit ?? true,
      max_violations: quiz.max_violations || 3,
      violation_action: quiz.violation_action || 'lock'
    },
    questions: sanitizedQuestions
  };
};

/**
 * Save Participant Answer for attempt
 */
export const saveParticipantAnswer = (attemptId, questionId, selectedAnswer) => {
  const attempts = loadAttempts();
  const attempt = attempts.find((a) => String(a.id) === String(attemptId));
  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt is no longer in progress');

  attempt.answers = attempt.answers || {};
  attempt.answers[questionId] = selectedAnswer.toUpperCase();
  saveAttempts(attempts);
  return true;
};

/**
 * Record Security Violation
 */
export const recordQuizViolation = (attemptId, participantId, violationType, details) => {
  const attempts = loadAttempts();
  const attempt = attempts.find((a) => String(a.id) === String(attemptId));
  if (!attempt) throw new Error('Attempt not found');

  const quizzes = loadLocalQuizzes();
  const quiz = quizzes.find((q) => String(q.id) === String(attempt.quiz_id));
  const maxViolations = quiz ? (quiz.max_violations || 3) : 3;
  const action = quiz ? (quiz.violation_action || 'lock') : 'lock';

  // Log violation record
  const violations = loadViolations();
  const newViolation = {
    id: `viol_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    attempt_id: attemptId,
    quiz_id: attempt.quiz_id,
    participant_id: participantId,
    violation_type: violationType,
    description: details || 'Security violation detected during quiz execution',
    timestamp: new Date().toISOString(),
    severity: attempt.violations_count + 1 >= maxViolations ? 'TERMINATION' : 'WARNING'
  };
  violations.unshift(newViolation);
  saveViolations(violations);

  // Increment attempt violation count
  attempt.violations_count = (attempt.violations_count || 0) + 1;
  let isActionTriggered = false;

  if (attempt.violations_count >= maxViolations) {
    isActionTriggered = true;
    if (action === 'auto_submit') {
      submitQuizAttempt(attemptId, participantId, true);
    } else {
      attempt.status = 'TERMINATED';
    }
  }

  saveAttempts(attempts);

  return {
    violationCount: attempt.violations_count,
    maxViolations,
    isActionTriggered,
    status: attempt.status
  };
};

/**
 * Server-Authoritative Quiz Submission & Grading Engine
 */
export const submitQuizAttempt = (attemptId, participantId, isAutoSubmitted = false) => {
  const attempts = loadAttempts();
  const attempt = attempts.find((a) => String(a.id) === String(attemptId));
  if (!attempt) throw new Error('Attempt not found');

  const quizzes = loadLocalQuizzes();
  const quiz = quizzes.find((q) => String(q.id) === String(attempt.quiz_id));
  if (!quiz) throw new Error('Quiz not found');

  let calculatedScore = 0;
  const questions = quiz.questions || [];
  const userAnswers = attempt.answers || {};

  const answerDetails = questions.map((q) => {
    const selectedAns = (userAnswers[q.id] || '').toUpperCase();
    const correctAns = (q.correct_answer || q.correct_option || 'A').toUpperCase();
    const isCorrect = selectedAns !== '' && selectedAns === correctAns;
    
    let pointsAwarded = 0;
    if (isCorrect) {
      pointsAwarded = parseFloat(q.marks) || 1;
    } else if (selectedAns !== '' && quiz.negative_marking) {
      pointsAwarded = -(parseFloat(q.negative_marks_value || q.negative_marks) || 0);
    }

    calculatedScore += pointsAwarded;

    return {
      questionId: q.id,
      prompt: q.prompt,
      selectedAnswer: selectedAns,
      correctAnswer: quiz.show_correct_answers ? correctAns : undefined,
      isCorrect,
      pointsAwarded
    };
  });

  attempt.status = isAutoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED';
  attempt.submitted_at = new Date().toISOString();
  attempt.score = Math.max(0, calculatedScore);

  saveAttempts(attempts);

  return {
    attemptId: attempt.id,
    status: attempt.status,
    score: attempt.score,
    totalMarks: attempt.total_marks,
    submittedAt: attempt.submitted_at,
    violationsCount: attempt.violations_count,
    showScore: quiz.show_score,
    showCorrectAnswers: quiz.show_correct_answers,
    answers: quiz.show_correct_answers ? answerDetails : []
  };
};

/* ================= RETEST MANAGEMENT ================= */

export const getRetestRequests = () => {
  const retests = loadRetests();
  const attempts = loadAttempts();
  const users = loadLocalUsers();
  const quizzes = loadLocalQuizzes();

  return retests.map((r) => {
    const userObj = users.find((u) => String(u.id) === String(r.participant_id) || String(u.email) === String(r.participant_id));
    const quizObj = quizzes.find((q) => String(q.id) === String(r.quiz_id));
    const userAttempts = attempts.filter((a) => String(a.participant_id) === String(r.participant_id) && String(a.quiz_id) === String(r.quiz_id));
    const violations = loadViolations().filter((v) => userAttempts.some((a) => a.id === v.attempt_id));

    return {
      ...r,
      userName: userObj ? userObj.name : 'Student Participant',
      userEmail: userObj ? userObj.email : r.participant_id,
      quizTitle: quizObj ? quizObj.title : 'Event Quiz',
      violationsCount: violations.length,
      violations
    };
  });
};

export const requestRetest = (participantId, quizId, reason) => {
  const retests = loadRetests();
  const existing = retests.find((r) => String(r.participant_id) === String(participantId) && String(r.quiz_id) === String(quizId) && r.status === 'pending');

  if (existing) return existing;

  const newRequest = {
    id: `ret_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    quiz_id: quizId,
    participant_id: participantId,
    status: 'pending',
    reason: reason || 'Requested another attempt due to technical issue / security lockout',
    granted_at: null,
    requested_at: new Date().toISOString()
  };

  retests.unshift(newRequest);
  saveRetests(retests);
  return newRequest;
};

export const grantRetest = (requestIdOrParticipantId, quizId, adminMessage) => {
  const retests = loadRetests();
  let request = retests.find((r) => String(r.id) === String(requestIdOrParticipantId) || (String(r.participant_id) === String(requestIdOrParticipantId) && String(r.quiz_id) === String(quizId)));

  if (!request) {
    request = {
      id: `ret_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      quiz_id: quizId,
      participant_id: requestIdOrParticipantId,
      status: 'granted',
      reason: 'Admin manually granted retest',
      admin_message: adminMessage || 'Retest permission granted by administrator.',
      granted_at: new Date().toISOString()
    };
    retests.unshift(request);
  } else {
    request.status = 'granted';
    request.admin_message = adminMessage || 'Retest permission granted by administrator.';
    request.granted_at = new Date().toISOString();
  }

  saveRetests(retests);
  return request;
};

export const revokeRetest = (requestIdOrParticipantId, quizId) => {
  const retests = loadRetests();
  const request = retests.find((r) => String(r.id) === String(requestIdOrParticipantId) || (String(r.participant_id) === String(requestIdOrParticipantId) && String(r.quiz_id) === String(quizId)));

  if (!request) throw new Error('Retest request not found');

  request.status = 'denied';
  request.admin_message = 'Retest request denied by administrator.';

  saveRetests(retests);
  return request;
};

/* ================= RESULTS & VIOLATION LOGS ================= */

/* ================= RESULTS & VIOLATION LOGS & QUALIFICATION ================= */

export const getQuizSubmissions = (quizId) => {
  const attempts = loadAttempts().filter((a) => String(a.quiz_id) === String(quizId));
  const users = loadLocalUsers();
  const quizzes = loadLocalQuizzes();
  const quizObj = quizzes.find((q) => String(q.id) === String(quizId));
  const questionsCount = (quizObj?.questions || []).length;
  const registrations = loadRegistrations();

  return attempts.map((a) => {
    const userObj = users.find((u) => String(u.id) === String(a.participant_id) || String(u.email) === String(a.participant_id));
    const regObj = registrations.find((r) => String(r.quiz_id) === String(quizId) && String(r.participant_id) === String(a.participant_id));
    const violations = loadViolations().filter((v) => v.attempt_id === a.id);

    // Calculate correct answer count
    let correctCount = 0;
    const userAnswers = a.answers || {};
    (quizObj?.questions || []).forEach((q) => {
      const selected = (userAnswers[q.id] || '').toUpperCase();
      const correct = (q.correct_answer || q.correct_option || 'A').toUpperCase();
      if (selected !== '' && selected === correct) {
        correctCount++;
      }
    });

    return {
      attemptId: a.id,
      participantId: a.participant_id,
      participantName: userObj ? userObj.name : 'Student Participant',
      participantEmail: userObj ? userObj.email : a.participant_id,
      participantPhone: userObj ? userObj.phone : '',
      userAccountStatus: userObj ? userObj.status : 'Active',
      quizId: a.quiz_id,
      quizTitle: quizObj ? quizObj.title : 'Event Quiz',
      attemptNumber: a.attempt_number,
      score: a.score,
      totalMarks: a.total_marks,
      percentage: a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0,
      correctCount,
      totalQuestions: questionsCount,
      status: a.status,
      qualificationStatus: a.qualification_status || regObj?.qualification_status || 'PENDING',
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      violationsCount: violations.length,
      answers: a.answers || {}
    };
  });
};

export const filterAndQualifyNextRound = (quizId, topCount = 5, nextRoundQuizId = null) => {
  const attempts = loadAttempts();
  const quizAttempts = attempts.filter((a) => String(a.quiz_id) === String(quizId) && (a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'submitted'));

  // Sort by score DESC, percentage DESC, then earliest submission time ASC
  quizAttempts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
  });

  const count = Math.max(1, parseInt(topCount, 10) || 1);
  const qualifiedAttempts = quizAttempts.slice(0, count);
  const eliminatedAttempts = quizAttempts.slice(count);

  const qualifiedSet = new Set(qualifiedAttempts.map((a) => String(a.participant_id)));
  const eliminatedSet = new Set(eliminatedAttempts.map((a) => String(a.participant_id)));

  // 1. Update Attempts
  attempts.forEach((a) => {
    if (String(a.quiz_id) === String(quizId)) {
      if (qualifiedSet.has(String(a.participant_id))) {
        a.qualification_status = 'QUALIFIED';
      } else if (eliminatedSet.has(String(a.participant_id))) {
        a.qualification_status = 'ELIMINATED';
      }
    }
  });
  saveAttempts(attempts);

  // 2. Update Registrations & Next Round Access
  const regs = loadRegistrations();
  regs.forEach((r) => {
    if (String(r.quiz_id) === String(quizId)) {
      if (qualifiedSet.has(String(r.participant_id))) {
        r.qualification_status = 'QUALIFIED';
        r.next_round_quiz_id = nextRoundQuizId || null;
      } else if (eliminatedSet.has(String(r.participant_id))) {
        r.qualification_status = 'ELIMINATED';
      }
    }
  });

  // Grant access to Next Round Quiz if specified
  if (nextRoundQuizId) {
    qualifiedSet.forEach((pid) => {
      registerParticipantForQuiz(pid, nextRoundQuizId);
      setParticipantAccessByQuizAndUser(nextRoundQuizId, pid, 'Granted');
    });
  }
  saveRegistrations(regs);

  // 3. Update Users Database: Disable account for ELIMINATED participants
  const users = loadLocalUsers();
  const updatedUsers = users.map((u) => {
    if (eliminatedSet.has(String(u.id)) || eliminatedSet.has(String(u.email))) {
      const disabledUser = { ...u, status: 'Disabled' }; // Account locked so user cannot login again
      if (supabase) {
        supabase.from('users').update({ status: 'Disabled' }).eq('id', u.id).then().catch((e) => console.warn('Supabase disable user warning:', e.message));
      }
      return disabledUser;
    }
    return u;
  });
  saveLocalUsers(updatedUsers);

  return {
    success: true,
    quizId,
    topCount: count,
    qualifiedCount: qualifiedAttempts.length,
    eliminatedCount: eliminatedAttempts.length,
    qualifiedParticipants: Array.from(qualifiedSet),
    eliminatedParticipants: Array.from(eliminatedSet)
  };
};

export const toggleParticipantQualification = (quizId, participantId, newQualificationStatus, nextRoundQuizId = null) => {
  const attempts = loadAttempts();
  const regs = loadRegistrations();

  attempts.forEach((a) => {
    if (String(a.quiz_id) === String(quizId) && (String(a.participant_id) === String(participantId) || String(a.participant_id) === String(participantId))) {
      a.qualification_status = newQualificationStatus;
    }
  });
  saveAttempts(attempts);

  regs.forEach((r) => {
    if (String(r.quiz_id) === String(quizId) && String(r.participant_id) === String(participantId)) {
      r.qualification_status = newQualificationStatus;
      r.next_round_quiz_id = newQualificationStatus === 'QUALIFIED' ? nextRoundQuizId : null;
    }
  });

  if (newQualificationStatus === 'QUALIFIED' && nextRoundQuizId) {
    registerParticipantForQuiz(participantId, nextRoundQuizId);
    setParticipantAccessByQuizAndUser(nextRoundQuizId, participantId, 'Granted');
  }
  saveRegistrations(regs);

  // Update User Account Status
  const users = loadLocalUsers();
  const updatedUsers = users.map((u) => {
    if (String(u.id) === String(participantId) || String(u.email) === String(participantId)) {
      return { ...u, status: newQualificationStatus === 'ELIMINATED' ? 'Disabled' : 'Active' };
    }
    return u;
  });
  saveLocalUsers(updatedUsers);

  return { success: true, participantId, newQualificationStatus };
};

export const getParticipantQualification = (participantId) => {
  const regs = loadRegistrations().filter((r) => String(r.participant_id) === String(participantId));
  const quizzes = loadLocalQuizzes();

  const isEliminated = regs.some((r) => r.qualification_status === 'ELIMINATED');
  const qualifiedReg = regs.find((r) => r.qualification_status === 'QUALIFIED');

  let nextQuizObj = null;
  if (qualifiedReg && qualifiedReg.next_round_quiz_id) {
    nextQuizObj = quizzes.find((q) => String(q.id) === String(qualifiedReg.next_round_quiz_id));
  }

  return {
    participantId,
    isEliminated,
    isQualified: Boolean(qualifiedReg),
    qualificationStatus: isEliminated ? 'ELIMINATED' : (qualifiedReg ? 'QUALIFIED' : 'PENDING'),
    nextRoundQuiz: nextQuizObj ? { id: nextQuizObj.id, title: nextQuizObj.title, start: nextQuizObj.start_date_time } : null,
    message: isEliminated 
      ? 'SORRY, YOU HAVE NOT BEEN SELECTED FOR THE NEXT ROUND. Thank you for participating in Eloquence 2K26.'
      : (qualifiedReg 
        ? `CONGRATULATIONS! You have been selected for the Next Round (${nextQuizObj ? nextQuizObj.title : 'Next Quiz Event'})!`
        : null)
  };
};

export const getAllResults = () => {

  const attempts = loadAttempts();
  const users = loadLocalUsers();
  const quizzes = loadLocalQuizzes();

  return attempts.map((a) => {
    const userObj = users.find((u) => String(u.id) === String(a.participant_id) || String(u.email) === String(a.participant_id));
    const quizObj = quizzes.find((q) => String(q.id) === String(a.quiz_id));
    const violations = loadViolations().filter((v) => v.attempt_id === a.id);

    return {
      attemptId: a.id,
      participantId: a.participant_id,
      participantName: userObj ? userObj.name : 'Student Participant',
      participantEmail: userObj ? userObj.email : a.participant_id,
      quizId: a.quiz_id,
      quizTitle: quizObj ? quizObj.title : 'Event Quiz',
      attemptNumber: a.attempt_number,
      score: a.score,
      totalMarks: a.total_marks,
      percentage: a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0,
      status: a.status,
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      violationsCount: violations.length,
      violations
    };
  });
};

export const getAllViolations = () => {
  const violations = loadViolations();
  const users = loadLocalUsers();
  const quizzes = loadLocalQuizzes();

  return violations.map((v) => {
    const userObj = users.find((u) => String(u.id) === String(v.participant_id) || String(u.email) === String(v.participant_id));
    const quizObj = quizzes.find((q) => String(q.id) === String(v.quiz_id));

    return {
      ...v,
      participantName: userObj ? userObj.name : 'Student Participant',
      participantEmail: userObj ? userObj.email : v.participant_id,
      quizTitle: quizObj ? quizObj.title : 'Event Quiz'
    };
  });
};

export const getParticipantDashboardStats = (participantId) => {
  const users = loadLocalUsers();
  const matchedUser = users.find((u) => 
    String(u.id) === String(participantId) || 
    String(u.email).toLowerCase() === String(participantId).toLowerCase() || 
    String(u.phone) === String(participantId)
  );

  const userIds = new Set([
    String(participantId),
    matchedUser ? String(matchedUser.id) : null,
    matchedUser ? String(matchedUser.email).toLowerCase() : null
  ].filter(Boolean));

  const regs = loadRegistrations().filter((r) => 
    r.access_status === 'Granted' && (userIds.has(String(r.participant_id)) || userIds.has(String(r.participant_id).toLowerCase()))
  );

  const assignedQuizIds = new Set(regs.map((r) => String(r.quiz_id)));
  const assignedQuizzesCount = assignedQuizIds.size;

  const allAttempts = loadAttempts();
  const userAttempts = allAttempts.filter((a) => 
    userIds.has(String(a.participant_id)) || userIds.has(String(a.participant_id).toLowerCase())
  );

  const completedAttempts = userAttempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'submitted');
  const attendedQuizIds = new Set(completedAttempts.map((a) => String(a.quiz_id)));

  let totalScore = 0;
  let totalPossibleMarks = 0;
  let certificates = 0;

  completedAttempts.forEach((a) => {
    totalScore += (a.score || 0);
    totalPossibleMarks += (a.total_marks || 0);
    if (a.total_marks > 0 && (a.score / a.total_marks) >= 0.5) {
      certificates++;
    }
  });

  const accuracy = totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0;

  // Real Leaderboard Rank calculation
  const leaderboardMap = {};
  allAttempts.forEach((a) => {
    if (a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'submitted') {
      const pid = String(a.participant_id);
      leaderboardMap[pid] = (leaderboardMap[pid] || 0) + (a.score || 0);
    }
  });

  const sortedLeaderboard = Object.entries(leaderboardMap).sort((a, b) => b[1] - a[1]);
  let rank = 'Unranked';
  if (completedAttempts.length > 0) {
    const userRankIndex = sortedLeaderboard.findIndex(([pid]) => userIds.has(pid));
    if (userRankIndex !== -1) {
      rank = `#${userRankIndex + 1}`;
    } else {
      rank = `#${sortedLeaderboard.length + 1}`;
    }
  }

  return {
    participantId,
    name: matchedUser ? matchedUser.name : 'Student Participant',
    email: matchedUser ? matchedUser.email : participantId,
    attendedCount: attendedQuizIds.size,
    totalQuizzesCount: assignedQuizzesCount,
    totalScore,
    totalPossibleMarks,
    accuracy,
    certificates,
    rank,
    completedAttemptsCount: completedAttempts.length
  };
};

