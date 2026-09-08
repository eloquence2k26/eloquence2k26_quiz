import crypto from 'crypto';
import { supabase } from './supabase.js';

// Helper to generate UUIDs
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/* =========================================================================
   1. USERS TABLE MANAGEMENT (public.users)
   ========================================================================= */

// Fetch all users directly from Supabase DB
export const getUsersFromDB = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getUsersFromDB error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase getUsersFromDB exception:', err.message);
    return [];
  }
};

// Insert or upsert single user in Supabase DB
export const insertUserToDB = async (userObj) => {
  try {
    const isValidUUID = userObj.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userObj.id);
    const userPayload = {
      id: isValidUUID ? userObj.id : generateUUID(),
      name: userObj.name || 'Participant',
      phone: String(userObj.phone || ''),
      email: userObj.email || `${(userObj.name || 'user').toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
      password: userObj.password || '1234',
      role: userObj.role || 'user',
      status: userObj.status || 'Active',
      quizzes_attempted: userObj.quizzes_attempted || 0,
      score: userObj.score || 0,
      created_at: userObj.created_at || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .upsert([userPayload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase insertUserToDB error:', error.message);
      // If error on conflict with email, try update by email
      const { data: updated, error: uErr } = await supabase
        .from('users')
        .update(userPayload)
        .eq('email', userPayload.email)
        .select()
        .single();
      if (!uErr && updated) return updated;
      return userPayload;
    }
    return data || userPayload;
  } catch (err) {
    console.error('Supabase insertUserToDB exception:', err.message);
    return userObj;
  }
};

// Bulk insert/upsert users in Supabase DB
export const bulkInsertUsersToDB = async (userList) => {
  try {
    if (!Array.isArray(userList) || userList.length === 0) return [];

    const prepared = userList.map((u) => {
      const isValidUUID = u.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id);
      return {
        id: isValidUUID ? u.id : generateUUID(),
        name: u.name || 'Participant',
        phone: String(u.phone || '0000000000'),
        email: u.email || `${(u.name || 'user').toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
        password: u.password || '1234',
        role: u.role || 'user',
        status: u.status || 'Active',
        quizzes_attempted: u.quizzes_attempted || 0,
        score: u.score || 0,
        created_at: u.created_at || new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('users')
      .upsert(prepared, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase bulkInsertUsersToDB error:', error.message);
      return prepared;
    }
    return data || prepared;
  } catch (err) {
    console.error('Supabase bulkInsertUsersToDB exception:', err.message);
    return userList;
  }
};

// Update user by ID in Supabase DB
export const updateUserInDB = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateUserInDB error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Supabase updateUserInDB exception:', err.message);
    return null;
  }
};

// Delete user by ID in Supabase DB
export const deleteUserFromDB = async (id) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteUserFromDB error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteUserFromDB exception:', err.message);
    return false;
  }
};

// Find user by ID, email, or phone
export const findUserInDB = async (identifier) => {
  if (!identifier) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${identifier},email.ilike.${identifier},phone.eq.${identifier}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch (err) {
    return null;
  }
};

/* =========================================================================
   2. QUIZZES & QUESTIONS MANAGEMENT (public.quizzes & public.quiz_questions)
   ========================================================================= */

// Format question from Supabase row to frontend format
const formatQuestionRow = (qn) => ({
  id: qn.id,
  quiz_id: qn.quiz_id,
  prompt: qn.prompt,
  questionText: qn.prompt,
  option_a: qn.option_a || '',
  optionA: qn.option_a || '',
  option_b: qn.option_b || '',
  optionB: qn.option_b || '',
  option_c: qn.option_c || '',
  optionC: qn.option_c || '',
  option_d: qn.option_d || '',
  optionD: qn.option_d || '',
  optionsCount: qn.option_d ? 4 : (qn.option_c ? 3 : 2),
  options_count: qn.option_d ? 4 : (qn.option_c ? 3 : 2),
  correct_answer: qn.correct_option || 'A',
  correctOption: qn.correct_option || 'A',
  correct_option: qn.correct_option || 'A',
  marks: Number(qn.marks) || 1,
  negative_marks: Number(qn.negative_marks) || 0,
  image_url: qn.image_url || '',
  question_image: qn.image_url || '',
  explanation: '',
  question_order: qn.question_order || 1,
  created_at: qn.created_at
});

// Fetch all quizzes with their child questions from Supabase DB
export const getQuizzesFromDB = async () => {
  try {
    const { data: quizzesData, error: qErr } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (qErr) {
      console.error('Supabase getQuizzesFromDB error:', qErr.message);
      return [];
    }

    if (!Array.isArray(quizzesData) || quizzesData.length === 0) {
      return [];
    }

    const { data: questionsData, error: qnErr } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('question_order', { ascending: true });

    const questionsMap = {};
    if (!qnErr && Array.isArray(questionsData)) {
      questionsData.forEach((qn) => {
        if (!questionsMap[qn.quiz_id]) questionsMap[qn.quiz_id] = [];
        questionsMap[qn.quiz_id].push(formatQuestionRow(qn));
      });
    }

    return quizzesData.map((q) => {
      const qns = questionsMap[q.id] || [];
      return {
        ...q,
        questions: qns,
        questions_count: qns.length,
        total_questions: qns.length || 30,
        marks_per_question: qns.length > 0 ? (qns[0].marks || 1) : 1
      };
    });
  } catch (err) {
    console.error('Supabase getQuizzesFromDB exception:', err.message);
    return [];
  }
};

// Fetch single quiz by ID with questions from Supabase DB
export const getQuizByIdFromDB = async (quizId) => {
  try {
    const { data: quiz, error: qErr } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();

    if (qErr || !quiz) return null;

    const { data: questions, error: qnErr } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_order', { ascending: true });

    const formattedQuestions = (!qnErr && Array.isArray(questions))
      ? questions.map(formatQuestionRow)
      : [];

    return {
      ...quiz,
      questions: formattedQuestions,
      questions_count: formattedQuestions.length,
      total_questions: formattedQuestions.length || 30,
      marks_per_question: formattedQuestions.length > 0 ? (formattedQuestions[0].marks || 1) : 1
    };
  } catch (err) {
    console.error('Supabase getQuizByIdFromDB exception:', err.message);
    return null;
  }
};

// Insert new Quiz into Supabase DB
export const insertQuizToDB = async (quizObj) => {
  try {
    const quizId = quizObj.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Only pass exact columns that exist in the quizzes table
    const dbQuiz = {
      id: quizId,
      title: quizObj.title || 'Untitled Symposium Quiz',
      description: quizObj.description || '',
      event_id: quizObj.event_id || 'evt_eloquence_2026',
      category: quizObj.category || 'General Technology',
      start_date_time: quizObj.start_date_time || quizObj.start_time || new Date().toISOString(),
      end_date_time: quizObj.end_date_time || quizObj.end_time || new Date(Date.now() + 86400000).toISOString(),
      duration: parseInt(quizObj.duration, 10) || 30,
      max_attempts: parseInt(quizObj.max_attempts, 10) || 1,
      status: quizObj.status || 'Published',
      fullscreen_required: quizObj.fullscreen_required ?? true,
      detect_visibility_change: quizObj.detect_visibility_change ?? true,
      detect_tab_switch: quizObj.detect_tab_switch ?? true,
      detect_focus_loss: quizObj.detect_focus_loss ?? true,
      detect_fullscreen_exit: quizObj.detect_fullscreen_exit ?? true,
      max_violations: parseInt(quizObj.max_violations, 10) || 3,
      violation_action: quizObj.violation_action || 'lock',
      allow_retest: quizObj.allow_retest ?? true,
      created_at: new Date().toISOString()
    };

    const { data: createdQuiz, error: qErr } = await supabase
      .from('quizzes')
      .upsert([dbQuiz], { onConflict: 'id' })
      .select()
      .single();

    if (qErr) {
      console.error('Supabase insertQuizToDB error:', qErr.message);
      return dbQuiz;
    }

    // Insert questions if provided
    let savedQuestions = [];
    if (Array.isArray(quizObj.questions) && quizObj.questions.length > 0) {
      const qnPayloads = quizObj.questions.map((qn, idx) => ({
        id: qn.id || `qn_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        quiz_id: quizId,
        prompt: qn.prompt || qn.questionText || qn.question || 'Question',
        option_a: qn.option_a || qn.optionA || '',
        option_b: qn.option_b || qn.optionB || '',
        option_c: qn.option_c || qn.optionC || '',
        option_d: qn.option_d || qn.optionD || '',
        correct_option: (qn.correct_option || qn.correct_answer || qn.correctOption || 'A').toUpperCase(),
        marks: parseFloat(qn.marks) || 1,
        negative_marks: parseFloat(qn.negative_marks) || 0,
        image_url: qn.image_url || qn.question_image || '',
        question_order: parseInt(qn.question_order, 10) || (idx + 1),
        created_at: new Date().toISOString()
      }));

      const { data: qnData, error: qnErr } = await supabase
        .from('quiz_questions')
        .upsert(qnPayloads, { onConflict: 'id' })
        .select();

      if (!qnErr && Array.isArray(qnData)) {
        savedQuestions = qnData.map(formatQuestionRow);
      }
    }

    return {
      ...(createdQuiz || dbQuiz),
      questions: savedQuestions,
      questions_count: savedQuestions.length
    };
  } catch (err) {
    console.error('Supabase insertQuizToDB exception:', err.message);
    return quizObj;
  }
};

// Update Quiz in Supabase DB
export const updateQuizInDB = async (id, updates) => {
  try {
    const validCols = [
      'title', 'description', 'event_id', 'category', 'start_date_time', 'end_date_time',
      'duration', 'max_attempts', 'status', 'fullscreen_required', 'detect_visibility_change',
      'detect_tab_switch', 'detect_focus_loss', 'detect_fullscreen_exit', 'max_violations',
      'violation_action', 'allow_retest'
    ];

    const dbFields = {};
    for (const key of Object.keys(updates)) {
      if (validCols.includes(key)) {
        dbFields[key] = updates[key];
      }
    }

    if (updates.start_time && !dbFields.start_date_time) dbFields.start_date_time = updates.start_time;
    if (updates.end_time && !dbFields.end_date_time) dbFields.end_date_time = updates.end_time;

    const { error } = await supabase
      .from('quizzes')
      .update(dbFields)
      .eq('id', id);

    if (error) {
      console.error('Supabase updateQuizInDB error:', error.message);
    }

    return await getQuizByIdFromDB(id);
  } catch (err) {
    console.error('Supabase updateQuizInDB exception:', err.message);
    return null;
  }
};

// Update Quiz Schedule in Supabase DB
export const updateQuizScheduleInDB = async (id, startTime, endTime) => {
  return updateQuizInDB(id, { 
    start_date_time: startTime, 
    end_date_time: endTime 
  });
};

// Delete Quiz in Supabase DB (Cascade cleans questions & registrations)
export const deleteQuizFromDB = async (id) => {
  try {
    // Delete registrations, questions, attempts first if foreign key cascade not default
    await supabase.from('quiz_questions').delete().eq('quiz_id', id);
    await supabase.from('quiz_registrations').delete().eq('quiz_id', id);
    await supabase.from('quiz_attempts').delete().eq('quiz_id', id);
    await supabase.from('retest_permissions').delete().eq('quiz_id', id);

    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteQuizFromDB error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteQuizFromDB exception:', err.message);
    return false;
  }
};

/* =========================================================================
   3. QUESTION MANAGEMENT (public.quiz_questions)
   ========================================================================= */

// Add single question to a quiz in Supabase DB
export const addQuestionToQuizInDB = async (quizId, questionObj) => {
  try {
    const questionId = questionObj.id || `qn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const qnPayload = {
      id: questionId,
      quiz_id: quizId,
      prompt: questionObj.prompt || questionObj.questionText || questionObj.question || '',
      option_a: questionObj.option_a || questionObj.optionA || '',
      option_b: questionObj.option_b || questionObj.optionB || '',
      option_c: questionObj.option_c || questionObj.optionC || '',
      option_d: questionObj.option_d || questionObj.optionD || '',
      correct_option: (questionObj.correct_option || questionObj.correct_answer || questionObj.correctOption || 'A').toUpperCase(),
      marks: parseFloat(questionObj.marks) || 1,
      negative_marks: parseFloat(questionObj.negative_marks || questionObj.negativeMarks) || 0,
      image_url: questionObj.image_url || questionObj.question_image || '',
      question_order: parseInt(questionObj.question_order, 10) || 1,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quiz_questions')
      .upsert([qnPayload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase addQuestionToQuizInDB error:', error.message);
      return { question: formatQuestionRow(qnPayload) };
    }

    const fullQuiz = await getQuizByIdFromDB(quizId);
    return { question: formatQuestionRow(data || qnPayload), quiz: fullQuiz };
  } catch (err) {
    console.error('Supabase addQuestionToQuizInDB exception:', err.message);
    return { question: questionObj };
  }
};

// Update question in Supabase DB
export const updateQuestionInQuizInDB = async (quizId, questionId, updates) => {
  try {
    const dbUpdates = {};
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.questionText !== undefined) dbUpdates.prompt = updates.questionText;
    if (updates.optionA !== undefined) dbUpdates.option_a = updates.optionA;
    if (updates.option_a !== undefined) dbUpdates.option_a = updates.option_a;
    if (updates.optionB !== undefined) dbUpdates.option_b = updates.optionB;
    if (updates.option_b !== undefined) dbUpdates.option_b = updates.option_b;
    if (updates.optionC !== undefined) dbUpdates.option_c = updates.optionC;
    if (updates.option_c !== undefined) dbUpdates.option_c = updates.option_c;
    if (updates.optionD !== undefined) dbUpdates.option_d = updates.optionD;
    if (updates.option_d !== undefined) dbUpdates.option_d = updates.option_d;
    if (updates.correct_option !== undefined) dbUpdates.correct_option = updates.correct_option.toUpperCase();
    if (updates.correct_answer !== undefined) dbUpdates.correct_option = updates.correct_answer.toUpperCase();
    if (updates.correctOption !== undefined) dbUpdates.correct_option = updates.correctOption.toUpperCase();
    if (updates.marks !== undefined) dbUpdates.marks = parseFloat(updates.marks);
    if (updates.negative_marks !== undefined) dbUpdates.negative_marks = parseFloat(updates.negative_marks);
    if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
    if (updates.question_image !== undefined) dbUpdates.image_url = updates.question_image;
    if (updates.question_order !== undefined) dbUpdates.question_order = parseInt(updates.question_order, 10);

    const { error } = await supabase
      .from('quiz_questions')
      .update(dbUpdates)
      .eq('id', questionId);

    if (error) {
      console.error('Supabase updateQuestionInQuizInDB error:', error.message);
    }

    return await getQuizByIdFromDB(quizId);
  } catch (err) {
    console.error('Supabase updateQuestionInQuizInDB exception:', err.message);
    return null;
  }
};

// Delete question from Supabase DB
export const deleteQuestionFromQuizInDB = async (quizId, questionId) => {
  try {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Supabase deleteQuestionFromQuizInDB error:', error.message);
    }

    return await getQuizByIdFromDB(quizId);
  } catch (err) {
    console.error('Supabase deleteQuestionFromQuizInDB exception:', err.message);
    return null;
  }
};

/* =========================================================================
   4. QUIZ REGISTRATIONS & PARTICIPANT ACCESS (public.quiz_registrations)
   ========================================================================= */

// Fetch all registrations for a quiz with participant user details
export const getQuizRegistrations = async (quizId) => {
  try {
    const { data: regs, error: rErr } = await supabase
      .from('quiz_registrations')
      .select('*')
      .eq('quiz_id', quizId)
      .order('registered_at', { ascending: false });

    if (rErr) {
      console.error('Supabase getQuizRegistrations error:', rErr.message);
      return [];
    }

    if (!Array.isArray(regs) || regs.length === 0) return [];

    const { data: usersData } = await supabase.from('users').select('id, name, email, phone');
    const userMap = new Map();
    if (Array.isArray(usersData)) {
      usersData.forEach((u) => {
        userMap.set(String(u.id), u);
        if (u.email) userMap.set(String(u.email).toLowerCase(), u);
        if (u.phone) userMap.set(String(u.phone), u);
      });
    }

    return regs.map((r) => {
      const u = userMap.get(String(r.participant_id)) || userMap.get(String(r.participant_id).toLowerCase());
      return {
        ...r,
        participantName: u?.name || r.participant_id,
        participantEmail: u?.email || r.participant_id,
        participantPhone: u?.phone || ''
      };
    });
  } catch (err) {
    console.error('Supabase getQuizRegistrations exception:', err.message);
    return [];
  }
};

// Register participant for a quiz in Supabase DB
export const registerParticipantForQuiz = async (participantId, quizId) => {
  try {
    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const regObj = {
      id: regId,
      quiz_id: quizId,
      participant_id: String(participantId),
      registration_status: 'Approved',
      access_status: 'Granted',
      qualification_status: 'PENDING',
      registered_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quiz_registrations')
      .upsert([regObj], { onConflict: 'quiz_id,participant_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase registerParticipantForQuiz error:', error.message);
      return regObj;
    }
    return data || regObj;
  } catch (err) {
    console.error('Supabase registerParticipantForQuiz exception:', err.message);
    return null;
  }
};

// Grant quiz access in Supabase DB
export const grantParticipantAccess = async (registrationId) => {
  try {
    const { data, error } = await supabase
      .from('quiz_registrations')
      .update({ access_status: 'Granted', approved_at: new Date().toISOString() })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) {
      console.error('Supabase grantParticipantAccess error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Supabase grantParticipantAccess exception:', err.message);
    return null;
  }
};

// Revoke quiz access in Supabase DB
export const revokeParticipantAccess = async (registrationId) => {
  try {
    const { data, error } = await supabase
      .from('quiz_registrations')
      .update({ access_status: 'Revoked' })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) {
      console.error('Supabase revokeParticipantAccess error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Supabase revokeParticipantAccess exception:', err.message);
    return null;
  }
};

// Set participant access status by quiz ID and participant ID in Supabase DB
export const setParticipantAccessByQuizAndUser = async (quizId, participantId, accessStatus) => {
  try {
    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const regObj = {
      id: regId,
      quiz_id: quizId,
      participant_id: String(participantId),
      registration_status: accessStatus === 'Granted' ? 'Approved' : 'Rejected',
      access_status: accessStatus,
      qualification_status: 'PENDING',
      registered_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('quiz_registrations')
      .upsert([regObj], { onConflict: 'quiz_id,participant_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase setParticipantAccessByQuizAndUser error:', error.message);
      return regObj;
    }
    return data || regObj;
  } catch (err) {
    console.error('Supabase setParticipantAccessByQuizAndUser exception:', err.message);
    return null;
  }
};

// =========================================================================
// Late Join Permission Cache & DB Handlers (5-Minute Window Rule)
// =========================================================================
export const lateJoinCache = new Map();

export const allowLateJoinInDB = async (quizId, participantId, adminMessage = 'Late entry permitted by administrator') => {
  try {
    const qid = String(quizId);
    if (!participantId || participantId === 'ALL') {
      lateJoinCache.set(`${qid}__ALL`, { quizId: qid, participantId: 'ALL', adminMessage, grantedAt: new Date().toISOString() });
    } else {
      const pid = String(participantId).toLowerCase();
      lateJoinCache.set(`${qid}__${pid}`, { quizId: qid, participantId: pid, adminMessage, grantedAt: new Date().toISOString() });
    }

    // Persist to Supabase retest_permissions table with status = 'late_join_granted'
    try {
      const permId = `late_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabase.from('retest_permissions').insert([{
        id: permId,
        quiz_id: qid,
        participant_id: participantId === 'ALL' ? 'ALL' : String(participantId),
        status: 'late_join_granted',
        reason: 'Late join authorized by admin',
        admin_message: adminMessage
      }]);
    } catch (persistErr) {
      console.warn('Supabase persist late join warning:', persistErr.message);
    }

    return { success: true, message: 'Late entry permission granted' };
  } catch (err) {
    console.error('allowLateJoinInDB error:', err);
    return { success: false, error: err.message };
  }
};

export const revokeLateJoinInDB = async (quizId, participantId) => {
  try {
    const qid = String(quizId);
    if (!participantId || participantId === 'ALL') {
      lateJoinCache.delete(`${qid}__ALL`);
    } else {
      const pid = String(participantId).toLowerCase();
      lateJoinCache.delete(`${qid}__${pid}`);
    }

    try {
      await supabase.from('retest_permissions')
        .update({ status: 'denied' })
        .eq('quiz_id', qid)
        .eq('participant_id', String(participantId))
        .eq('status', 'late_join_granted');
    } catch (revokeErr) {
      console.warn('Supabase revoke late join warning:', revokeErr.message);
    }

    return { success: true, message: 'Late entry permission revoked' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const checkLateJoinPermission = async (quizId, identifiers) => {
  const qid = String(quizId);
  if (lateJoinCache.has(`${qid}__ALL`)) return true;

  const idList = Array.isArray(identifiers) ? identifiers : [identifiers];
  for (const id of idList) {
    if (!id) continue;
    const cleanId = String(id).toLowerCase();
    if (lateJoinCache.has(`${qid}__${cleanId}`)) return true;
  }

  // Also query Supabase retest_permissions if not found in cache
  try {
    const { data } = await supabase
      .from('retest_permissions')
      .select('*')
      .eq('quiz_id', qid)
      .eq('status', 'late_join_granted');

    if (data && data.length > 0) {
      for (const r of data) {
        if (r.participant_id === 'ALL') {
          lateJoinCache.set(`${qid}__ALL`, r);
          return true;
        }
        for (const id of idList) {
          if (String(r.participant_id).toLowerCase() === String(id).toLowerCase()) {
            lateJoinCache.set(`${qid}__${String(id).toLowerCase()}`, r);
            return true;
          }
        }
      }
    }
  } catch (err) {
    // silently fallback
  }

  return false;
};

export const getLateJoinPermissionsForQuiz = async (quizId) => {
  const qid = String(quizId);
  const permissions = [];

  for (const [key, val] of lateJoinCache.entries()) {
    if (key.startsWith(`${qid}__`)) {
      permissions.push(val);
    }
  }

  try {
    const { data } = await supabase
      .from('retest_permissions')
      .select('*')
      .eq('quiz_id', qid)
      .eq('status', 'late_join_granted');

    (data || []).forEach((r) => {
      if (!permissions.some((p) => String(p.participantId).toLowerCase() === String(r.participant_id).toLowerCase())) {
        permissions.push({
          quizId: r.quiz_id,
          participantId: r.participant_id,
          adminMessage: r.admin_message,
          grantedAt: r.created_at || r.granted_at
        });
      }
    });
  } catch {}

  return permissions;
};

// Check participant access status for a quiz live in Supabase DB
export const checkParticipantQuizAccess = async (participantId, quizId) => {
  try {
    const pid = String(participantId || '');
    const isAdmin = pid === 'admin_1' || pid.toLowerCase() === 'admin@eloquence.com';

    // 1. Fetch Quiz from Supabase DB
    const quiz = await getQuizByIdFromDB(quizId);
    if (!quiz) {
      return { canStart: false, reason: 'Quiz event not found', status: 'not_found' };
    }

    if (isAdmin) {
      return { canStart: true, reason: 'Admin Access Granted', status: 'admin', quiz };
    }

    // 2. Lookup matched user
    const { data: usersData } = await supabase.from('users').select('*');
    const matchedUser = (usersData || []).find((u) =>
      String(u.id) === pid ||
      String(u.email).toLowerCase() === pid.toLowerCase() ||
      String(u.phone) === pid
    );

    const identifiers = [pid];
    if (matchedUser) {
      if (matchedUser.id && !identifiers.includes(String(matchedUser.id))) identifiers.push(String(matchedUser.id));
      if (matchedUser.email && !identifiers.includes(String(matchedUser.email).toLowerCase())) identifiers.push(String(matchedUser.email).toLowerCase());
      if (matchedUser.phone && !identifiers.includes(String(matchedUser.phone))) identifiers.push(String(matchedUser.phone));
    }

    // 3. Check Registrations in Supabase DB
    const { data: regData } = await supabase
      .from('quiz_registrations')
      .select('*')
      .eq('quiz_id', quizId);

    const reg = (regData || []).find((r) => identifiers.includes(String(r.participant_id)) || identifiers.includes(String(r.participant_id).toLowerCase()));

    if (!reg) {
      return { canStart: false, reason: 'Participant not registered or authorized by admin', status: 'not_registered' };
    }

    if (reg.access_status !== 'Granted') {
      return { canStart: false, reason: 'Quiz access has been revoked by admin', status: 'access_revoked' };
    }

    // 4. Check Schedule Window
    const now = new Date();
    const startTime = new Date(quiz.start_date_time || quiz.start_time);
    const endTime = new Date(quiz.end_date_time || quiz.end_time);

    if (now < startTime) {
      return { 
        canStart: false, 
        reason: `Quiz has not started yet. Scheduled for ${startTime.toLocaleString()}`, 
        status: 'not_started_yet',
        startTime: startTime.toISOString()
      };
    }

    if (now > endTime) {
      return { 
        canStart: false, 
        reason: 'Quiz window has expired', 
        status: 'expired',
        endTime: endTime.toISOString()
      };
    }

    // 5. Check Past Attempts & Ongoing Attempts
    const { data: attemptsData } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId);

    const userAttempts = (attemptsData || []).filter((a) => identifiers.includes(String(a.participant_id)));
    const ongoingAttempt = userAttempts.find((a) => a.status === 'IN_PROGRESS');

    // 6. Check 5-Minute Joining Window
    // Once event starts, participants have 5 minutes to join.
    // If > 5 minutes have elapsed, only participants who already joined or who have admin permission can join!
    const joinWindowMinutes = 5;
    const joinWindowEnd = new Date(startTime.getTime() + joinWindowMinutes * 60000);
    const isLateJoin = now > joinWindowEnd;
    let lateJoinApproved = false;

    if (isLateJoin && !ongoingAttempt) {
      lateJoinApproved = await checkLateJoinPermission(quizId, identifiers);
      if (!lateJoinApproved) {
        const minutesLate = Math.ceil((now.getTime() - joinWindowEnd.getTime()) / 60000);
        return {
          canStart: false,
          reason: `Joining window closed (${minutesLate} min${minutesLate === 1 ? '' : 's'} late). Participants must join within 5 minutes of event start. Only an administrator can permit late entry.`,
          status: 'late_locked',
          isLateLocked: true,
          joinWindowEnd: joinWindowEnd.toISOString(),
          startTime: startTime.toISOString(),
          minutesLate
        };
      }
    }

    // 7. Check Retest Approvals
    const { data: retestData } = await supabase
      .from('retest_permissions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('status', 'granted');

    const approvedRetest = (retestData || []).find((r) => identifiers.includes(String(r.participant_id)));

    const terminatedAttempt = userAttempts.find((a) => a.status === 'TERMINATED');

    if (terminatedAttempt && !approvedRetest) {
      return { canStart: false, reason: 'Quiz terminated due to security violations. Request admin retest.', status: 'terminated' };
    }

    const completedAttempts = userAttempts.filter((a) => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED');
    const maxAttempts = parseInt(quiz.max_attempts, 10) || 1;

    if (completedAttempts.length >= maxAttempts && !approvedRetest) {
      return { canStart: false, reason: 'Maximum attempts reached for this event quiz', status: 'completed' };
    }

    return { 
      canStart: true, 
      reason: lateJoinApproved ? 'Late Entry Authorized by Admin' : 'Access Authorized by Admin', 
      status: 'authorized', 
      approvedRetest: approvedRetest || null,
      lateJoinApproved: Boolean(lateJoinApproved),
      joinWindowEnd: joinWindowEnd.toISOString(),
      isWithinJoinWindow: !isLateJoin
    };
  } catch (err) {
    console.error('Supabase checkParticipantQuizAccess exception:', err.message);
    return { canStart: false, reason: 'Database error verifying access', status: 'error' };
  }
};

/* =========================================================================
   5. QUIZ ATTEMPTS & ANSWERS (public.quiz_attempts & public.attempt_answers)
   ========================================================================= */

// Start a quiz attempt in Supabase DB
export const startQuizAttempt = async (participantId, quizId) => {
  const access = await checkParticipantQuizAccess(participantId, quizId);
  if (!access.canStart) {
    throw new Error(access.reason || 'Access denied');
  }

  const quiz = await getQuizByIdFromDB(quizId);
  if (!quiz) throw new Error('Quiz not found');

  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const attemptObj = {
    id: attemptId,
    quiz_id: quizId,
    participant_id: String(participantId),
    attempt_number: 1,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString(),
    score: 0,
    total_marks: (quiz.questions || []).length * (quiz.marks_per_question || 1),
    violation_count: 0
  };

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert([attemptObj])
    .select()
    .single();

  if (error) {
    console.error('Supabase startQuizAttempt error:', error.message);
  }

  // Sanitize questions (hide correct_option from participant client during quiz take)
  const sanitizedQuestions = (quiz.questions || []).map((q) => {
    const { correct_option, correct_answer, correctOption, ...safe } = q;
    return safe;
  });

  return {
    attemptId,
    quiz: {
      ...quiz,
      questions: sanitizedQuestions
    },
    duration: quiz.duration
  };
};

// Save a participant answer in Supabase DB
export const saveParticipantAnswer = async (attemptId, questionId, selectedAnswer) => {
  try {
    const answerId = `ans_${attemptId}_${questionId}`;
    const { data: qn } = await supabase
      .from('quiz_questions')
      .select('correct_option, marks')
      .eq('id', questionId)
      .maybeSingle();

    const isCorrect = qn ? (String(qn.correct_option).toUpperCase() === String(selectedAnswer).toUpperCase()) : false;
    const marksAwarded = isCorrect ? (Number(qn?.marks) || 1) : 0;

    const answerPayload = {
      id: answerId,
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: String(selectedAnswer).toUpperCase(),
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
      answered_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('attempt_answers')
      .upsert([answerPayload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase saveParticipantAnswer error:', error.message);
    }
    return data || answerPayload;
  } catch (err) {
    console.error('Supabase saveParticipantAnswer exception:', err.message);
    return null;
  }
};

// Submit quiz attempt and compute live score in Supabase DB
export const submitQuizAttempt = async (attemptId, participantId, isAutoSubmitted = false) => {
  try {
    // 1. Fetch attempt and answers
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (!attempt) throw new Error('Attempt not found');

    const { data: answers } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id);

    let totalScore = 0;
    const qnMap = new Map();
    (questions || []).forEach((q) => qnMap.set(String(q.id), q));

    (answers || []).forEach((ans) => {
      const qn = qnMap.get(String(ans.question_id));
      if (qn && String(ans.selected_answer).toUpperCase() === String(qn.correct_option).toUpperCase()) {
        totalScore += Number(qn.marks || 1);
      }
    });

    const status = isAutoSubmitted ? 'AUTO_SUBMITTED' : 'SUBMITTED';
    const submittedAt = new Date().toISOString();

    const { data: updatedAttempt, error } = await supabase
      .from('quiz_attempts')
      .update({
        status,
        submitted_at: submittedAt,
        score: totalScore
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) {
      console.error('Supabase submitQuizAttempt error:', error.message);
    }

    // Update user score in users table
    const matchedUser = await findUserInDB(attempt.participant_id);
    if (matchedUser) {
      await supabase
        .from('users')
        .update({
          quizzes_attempted: (matchedUser.quizzes_attempted || 0) + 1,
          score: (matchedUser.score || 0) + totalScore
        })
        .eq('id', matchedUser.id);
    }

    return {
      attemptId,
      status,
      score: totalScore,
      totalQuestions: (questions || []).length,
      submittedAt
    };
  } catch (err) {
    console.error('Supabase submitQuizAttempt exception:', err.message);
    throw err;
  }
};

// Record a quiz violation in Supabase DB
export const recordQuizViolation = async (attemptId, participantId, violationType, details = '') => {
  try {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    const quizId = attempt?.quiz_id || '';
    const violationId = `vio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const violationObj = {
      id: violationId,
      attempt_id: attemptId,
      participant_id: String(participantId),
      violation_type: violationType,
      details: details || '',
      timestamp: new Date().toISOString()
    };

    await supabase.from('quiz_violations').insert([violationObj]);

    // Count violations for this attempt
    const { count } = await supabase
      .from('quiz_violations')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', attemptId);

    const currentViolations = count || 1;
    let shouldTerminate = false;

    if (quizId) {
      const quiz = await getQuizByIdFromDB(quizId);
      const maxAllowed = quiz?.max_violations || 3;
      if (currentViolations >= maxAllowed) {
        shouldTerminate = true;
        await supabase
          .from('quiz_attempts')
          .update({
            status: 'TERMINATED',
            violation_count: currentViolations
          })
          .eq('id', attemptId);
      } else {
        await supabase
          .from('quiz_attempts')
          .update({ violation_count: currentViolations })
          .eq('id', attemptId);
      }
    }

    return {
      violationsCount: currentViolations,
      terminated: shouldTerminate,
      violation: violationObj
    };
  } catch (err) {
    console.error('Supabase recordQuizViolation exception:', err.message);
    return { violationsCount: 1, terminated: false };
  }
};

/* =========================================================================
   6. ADMIN RESULTS, VIOLATIONS & RETESTS (public.quiz_violations & public.retest_permissions)
   ========================================================================= */

// Get all overall results from Supabase DB
export const getAllResults = async () => {
  try {
    const [
      { data: attempts },
      { data: registrations },
      { data: quizzes },
      { data: questions },
      { data: users }
    ] = await Promise.all([
      supabase.from('quiz_attempts').select('*').order('started_at', { ascending: false }),
      supabase.from('quiz_registrations').select('*').order('registered_at', { ascending: false }),
      supabase.from('quizzes').select('id, title, category, duration, status, event_id'),
      supabase.from('quiz_questions').select('quiz_id'),
      supabase.from('users').select('id, name, email, phone')
    ]);

    const attemptsList = attempts || [];
    const regsList = registrations || [];
    const quizList = quizzes || [];
    const userList = users || [];

    const questionCountMap = new Map();
    (questions || []).forEach(qn => {
      const qid = String(qn.quiz_id);
      questionCountMap.set(qid, (questionCountMap.get(qid) || 0) + 1);
    });

    const quizMap = new Map();
    quizList.forEach((q) => {
      quizMap.set(String(q.id), {
        ...q,
        total_questions: questionCountMap.get(String(q.id)) || 0
      });
    });

    const userMap = new Map();
    userList.forEach((u) => {
      userMap.set(String(u.id), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
      if (u.phone) userMap.set(String(u.phone), u);
    });

    let violationMap = new Map();
    if (attemptsList.length > 0) {
      try {
        const { data: violations } = await supabase
          .from('quiz_violations')
          .select('*')
          .in('attempt_id', attemptsList.map(a => a.id));
        (violations || []).forEach((v) => {
          if (!violationMap.has(v.attempt_id)) {
            violationMap.set(v.attempt_id, []);
          }
          violationMap.get(v.attempt_id).push(v);
        });
      } catch (e) {
        console.warn('Violations query warning in getAllResults:', e.message);
      }
    }

    const processedAttempts = attemptsList.map((att) => {
      const q = quizMap.get(String(att.quiz_id));
      const u = userMap.get(String(att.participant_id)) || userMap.get(String(att.participant_id).toLowerCase());
      
      let normalizedStatus = att.status;
      const statusUpper = String(att.status || '').toUpperCase();
      if (statusUpper === 'IN_PROGRESS') normalizedStatus = 'Ongoing';
      else if (['SUBMITTED', 'AUTO_SUBMITTED', 'COMPLETED'].includes(statusUpper)) normalizedStatus = 'Completed';
      else if (statusUpper === 'TERMINATED') normalizedStatus = 'Terminated';
      else if (statusUpper === 'NOT_STARTED' || statusUpper === 'PENDING') normalizedStatus = 'Pending';

      return {
        id: att.id,
        attemptId: att.id,
        attemptNumber: att.attempt_number || 1,
        quizId: att.quiz_id,
        quizTitle: q?.title || att.quiz_id,
        category: q?.category || 'General',
        participantId: att.participant_id,
        participantName: u?.name || att.participant_id,
        participantEmail: u?.email || att.participant_id,
        score: att.score || 0,
        totalMarks: att.total_marks || (q?.total_questions || 30),
        status: normalizedStatus,
        rawStatus: att.status,
        startedAt: att.started_at,
        submittedAt: att.submitted_at,
        violationsCount: att.violations_count || att.violation_count || 0,
        violations: violationMap.get(att.id) || []
      };
    });

    // Track which (participantId + quizId) pairs have attempts
    const attemptedKeys = new Set();
    attemptsList.forEach(a => {
      attemptedKeys.add(`${String(a.participant_id).toLowerCase()}_${String(a.quiz_id)}`);
      attemptedKeys.add(`${String(a.participant_id)}_${String(a.quiz_id)}`);
    });

    // For registered participants without an attempt, create a Pending record
    const pendingEntries = [];
    regsList.forEach((r) => {
      const pId = String(r.participant_id);
      const qId = String(r.quiz_id);
      const k1 = `${pId.toLowerCase()}_${qId}`;
      const k2 = `${pId}_${qId}`;

      if (!attemptedKeys.has(k1) && !attemptedKeys.has(k2)) {
        attemptedKeys.add(k1);
        attemptedKeys.add(k2);
        const q = quizMap.get(qId);
        const u = userMap.get(pId) || userMap.get(pId.toLowerCase());

        pendingEntries.push({
          id: `pending_${qId}_${pId}`,
          attemptId: null,
          attemptNumber: 0,
          quizId: qId,
          quizTitle: q?.title || qId,
          category: q?.category || 'General',
          participantId: pId,
          participantName: u?.name || pId,
          participantEmail: u?.email || pId,
          score: 0,
          totalMarks: q?.total_questions || 30,
          status: 'Pending',
          rawStatus: 'NOT_STARTED',
          startedAt: null,
          submittedAt: null,
          violationsCount: 0,
          violations: []
        });
      }
    });

    return {
      results: [...processedAttempts, ...pendingEntries],
      quizzes: quizList
    };
  } catch (err) {
    console.error('Supabase getAllResults exception:', err.message);
    return { results: [], quizzes: [] };
  }
};

// Get all violations log from Supabase DB
export const getAllViolations = async () => {
  try {
    const [
      { data: violations },
      { data: users }
    ] = await Promise.all([
      supabase.from('quiz_violations').select('*').order('timestamp', { ascending: false }),
      supabase.from('users').select('id, name, email')
    ]);
    const userMap = new Map();
    (users || []).forEach((u) => {
      userMap.set(String(u.id), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    });

    return (violations || []).map((v) => {
      const u = userMap.get(String(v.participant_id)) || userMap.get(String(v.participant_id).toLowerCase());
      return {
        ...v,
        description: v.details || '',
        participantName: u?.name || v.participant_id,
        participantEmail: u?.email || v.participant_id
      };
    });
  } catch (err) {
    console.error('Supabase getAllViolations exception:', err.message);
    return [];
  }
};

// Get quiz submissions for a specific quiz from Supabase DB
export const getQuizSubmissions = async (quizId) => {
  try {
    const [
      { data: attempts },
      { data: users }
    ] = await Promise.all([
      supabase.from('quiz_attempts').select('*').eq('quiz_id', quizId).order('score', { ascending: false }),
      supabase.from('users').select('id, name, email')
    ]);
    const userMap = new Map();
    (users || []).forEach((u) => {
      userMap.set(String(u.id), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    });

    return (attempts || []).map((att) => {
      const u = userMap.get(String(att.participant_id)) || userMap.get(String(att.participant_id).toLowerCase());
      return {
        ...att,
        participantName: u?.name || att.participant_id,
        participantEmail: u?.email || att.participant_id
      };
    });
  } catch (err) {
    console.error('Supabase getQuizSubmissions exception:', err.message);
    return [];
  }
};

// Request retest permission in Supabase DB
export const requestRetest = async (participantId, quizId, reason = '') => {
  try {
    const reqId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const retestObj = {
      id: reqId,
      quiz_id: quizId,
      participant_id: String(participantId),
      status: 'pending',
      admin_message: reason || 'Retest requested by participant'
    };

    const { data, error } = await supabase
      .from('retest_permissions')
      .insert([retestObj])
      .select()
      .single();

    if (error) {
      console.error('Supabase requestRetest error:', error.message);
      return retestObj;
    }
    return data || retestObj;
  } catch (err) {
    console.error('Supabase requestRetest exception:', err.message);
    return null;
  }
};

// Get all retest requests from Supabase DB
export const getRetestRequests = async () => {
  try {
    const { data: retests } = await supabase
      .from('retest_permissions')
      .select('*');

    const { data: quizzes } = await supabase.from('quizzes').select('id, title');
    const { data: users } = await supabase.from('users').select('id, name, email');

    const quizMap = new Map();
    (quizzes || []).forEach((q) => quizMap.set(String(q.id), q));

    const userMap = new Map();
    (users || []).forEach((u) => {
      userMap.set(String(u.id), u);
      if (u.email) userMap.set(String(u.email).toLowerCase(), u);
    });

    return (retests || []).map((r) => {
      const q = quizMap.get(String(r.quiz_id));
      const u = userMap.get(String(r.participant_id)) || userMap.get(String(r.participant_id).toLowerCase());
      return {
        ...r,
        requestId: r.id,
        quizTitle: q?.title || r.quiz_id,
        participantName: u?.name || r.participant_id,
        participantEmail: u?.email || r.participant_id
      };
    });
  } catch (err) {
    console.error('Supabase getRetestRequests exception:', err.message);
    return [];
  }
};

// Grant retest attempt in Supabase DB
export const grantRetest = async (requestIdOrAttemptId, quizId, adminMessage = 'Retest approved by Admin') => {
  try {
    let retest = null;
    if (requestIdOrAttemptId) {
      const { data } = await supabase
        .from('retest_permissions')
        .update({ status: 'granted', admin_message: adminMessage, approved_at: new Date().toISOString() })
        .eq('id', requestIdOrAttemptId)
        .select()
        .single();
      retest = data;
    }

    if (requestIdOrAttemptId) {
      await supabase
        .from('quiz_attempts')
        .update({ status: 'NOT_STARTED', violation_count: 0 })
        .eq('id', requestIdOrAttemptId);
    }

    return retest || { success: true };
  } catch (err) {
    console.error('Supabase grantRetest exception:', err.message);
    return { success: false };
  }
};

// Revoke / Deny retest in Supabase DB
export const revokeRetest = async (requestIdOrAttemptId, quizId) => {
  try {
    if (requestIdOrAttemptId) {
      await supabase
        .from('retest_permissions')
        .update({ status: 'denied' })
        .eq('id', requestIdOrAttemptId);
    }
    return { success: true };
  } catch (err) {
    console.error('Supabase revokeRetest exception:', err.message);
    return { success: false };
  }
};

/* =========================================================================
   7. QUALIFICATION & DASHBOARD STATS (public.quiz_registrations & public.quiz_attempts)
   ========================================================================= */

// Filter top N and qualify for next round in Supabase DB
export const filterAndQualifyNextRound = async (quizId, topCount = 5, nextRoundQuizId = null) => {
  try {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('score', { ascending: false });

    if (!Array.isArray(attempts) || attempts.length === 0) {
      return { qualifiedCount: 0, qualified: [], message: 'No completed attempts to qualify' };
    }

    // Deduplicate top scorers by participant_id
    const seen = new Set();
    const ranked = [];
    for (const a of attempts) {
      if (!seen.has(String(a.participant_id))) {
        seen.add(String(a.participant_id));
        ranked.push(a);
      }
    }

    const qualifiedList = ranked.slice(0, topCount);
    const qualifiedIds = qualifiedList.map((a) => String(a.participant_id));

    // Update quiz_registrations
    for (const pid of qualifiedIds) {
      await supabase
        .from('quiz_registrations')
        .update({
          qualification_status: 'QUALIFIED',
          next_round_quiz_id: nextRoundQuizId
        })
        .eq('quiz_id', quizId)
        .eq('participant_id', pid);

      // If next round exists, grant access to next round
      if (nextRoundQuizId) {
        await setParticipantAccessByQuizAndUser(nextRoundQuizId, pid, 'Granted');
      }
    }

    return {
      qualifiedCount: qualifiedList.length,
      qualified: qualifiedList,
      nextRoundQuizId
    };
  } catch (err) {
    console.error('Supabase filterAndQualifyNextRound exception:', err.message);
    return { qualifiedCount: 0, qualified: [] };
  }
};

// Toggle participant qualification in Supabase DB
export const toggleParticipantQualification = async (quizId, participantId, newStatus, nextRoundQuizId = null) => {
  try {
    await supabase
      .from('quiz_registrations')
      .update({
        qualification_status: newStatus,
        next_round_quiz_id: nextRoundQuizId
      })
      .eq('quiz_id', quizId)
      .eq('participant_id', String(participantId));

    if (newStatus === 'QUALIFIED' && nextRoundQuizId) {
      await setParticipantAccessByQuizAndUser(nextRoundQuizId, String(participantId), 'Granted');
    }

    return { success: true, participantId, qualificationStatus: newStatus };
  } catch (err) {
    console.error('Supabase toggleParticipantQualification exception:', err.message);
    return { success: false };
  }
};

// Get participant qualification status from Supabase DB
export const getParticipantQualification = async (participantId) => {
  try {
    const pid = String(participantId || '');
    const { data: regs } = await supabase
      .from('quiz_registrations')
      .select('*')
      .or(`participant_id.eq.${pid},participant_id.ilike.${pid}`);

    const qualified = (regs || []).find((r) => r.qualification_status === 'QUALIFIED');
    const eliminated = (regs || []).find((r) => r.qualification_status === 'ELIMINATED');

    return {
      isQualified: Boolean(qualified),
      isEliminated: Boolean(eliminated) && !Boolean(qualified),
      nextRoundQuizId: qualified?.next_round_quiz_id || null
    };
  } catch (err) {
    return { isQualified: false, isEliminated: false, nextRoundQuizId: null };
  }
};

// Get participant dashboard live stats from Supabase DB
export const getParticipantDashboardStats = async (participantId) => {
  try {
    const pid = String(participantId || '');
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${pid},email.ilike.${pid},phone.eq.${pid}`)
      .maybeSingle();

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .or(`participant_id.eq.${pid},participant_id.ilike.${pid}`);

    const { count: totalQuizzesCount } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    const attendedCount = (attempts || []).length;
    let totalScore = 0;
    let totalMaxMarks = 0;

    (attempts || []).forEach((a) => {
      totalScore += Number(a.score || 0);
      totalMaxMarks += Number(a.total_marks || 100);
    });

    const accuracy = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;
    const certificates = (attempts || []).filter((a) => Number(a.score) >= 50).length;

    return {
      attendedCount,
      totalQuizzesCount: totalQuizzesCount || 0,
      totalScore: user?.score || totalScore,
      accuracy,
      certificates,
      rank: totalScore > 0 ? '#1' : 'Unranked'
    };
  } catch (err) {
    return {
      attendedCount: 0,
      totalQuizzesCount: 0,
      totalScore: 0,
      accuracy: 0,
      certificates: 0,
      rank: 'Unranked'
    };
  }
};
