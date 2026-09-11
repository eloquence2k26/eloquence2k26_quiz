const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');
const DocumentParserService = require('../services/documentParserService');

class QuestionController {
  /**
   * Get all questions (Admin only)
   */
  static async getAllQuestions(req, res) {
    try {
      const { category, difficulty, search, event, round } = req.query;
      const rawQuestions = db.get('questions');
      const quizzes = db.get('quizzes') || [];
      const quizQuestions = db.get('quiz_questions') || [];
      const registeredEvents = db.get('events') || [];
      const defaultEventTitle = registeredEvents[0]?.title || quizzes[0]?.event_name || quizzes[0]?.title || 'Test run';

      // Enrich questions with associated event and rounds
      let questions = rawQuestions.map((q) => {
        const junctions = quizQuestions.filter((qq) => qq.question_id === q.id);
        const relatedQuizzes = junctions
          .map((qq) => quizzes.find((qz) => qz.id === qq.quiz_id))
          .filter(Boolean);

        const eventNames = Array.from(
          new Set([
            q.event_name,
            ...relatedQuizzes.map((qz) => qz.event_name || defaultEventTitle)
          ].filter(Boolean))
        );
        if (eventNames.length === 0) eventNames.push(defaultEventTitle);

        const roundNumbers = Array.from(
          new Set([
            q.round_number,
            ...(Array.isArray(q.rounds) ? q.rounds : []),
            ...relatedQuizzes.map((qz) => qz.round_number)
          ].filter((r) => r !== undefined && r !== null))
        );
        if (roundNumbers.length === 0) roundNumbers.push(1);

        return {
          ...q,
          event_name: q.event_name || eventNames[0] || defaultEventTitle,
          events: eventNames,
          round_numbers: roundNumbers,
          round_number: q.round_number || roundNumbers[0] || 1
        };
      });

      if (event && event !== 'ALL') {
        questions = questions.filter((q) =>
          (q.events && q.events.some((e) => e.toLowerCase() === event.toLowerCase())) ||
          (q.event_name && q.event_name.toLowerCase() === event.toLowerCase())
        );
      }
      if (round && round !== 'ALL') {
        const rNum = Number(round);
        questions = questions.filter((q) =>
          (Array.isArray(q.round_numbers) && q.round_numbers.includes(rNum)) ||
          q.round_number === rNum
        );
      }
      if (category && category !== 'ALL') {
        questions = questions.filter((q) => q.category && q.category.toLowerCase() === category.toLowerCase());
      }
      if (difficulty && difficulty !== 'ALL') {
        questions = questions.filter((q) => q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase());
      }
      if (search) {
        const term = search.toLowerCase();
        questions = questions.filter((q) =>
          q.question_text.toLowerCase().includes(term) ||
          (q.category && q.category.toLowerCase().includes(term)) ||
          (q.event_name && q.event_name.toLowerCase().includes(term))
        );
      }

      return success(res, questions);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Create single question
   */
  static async createQuestion(req, res) {
    try {
      const {
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        marks = 1.0,
        negative_marks = 0.0,
        explanation = '',
        category = 'General',
        difficulty = 'Medium',
        event_name = 'Eloquence 2026',
        round_number = 1
      } = req.body;

      if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
        return error(res, 'Question text, all 4 options, and correct answer are required', 400);
      }

      if (!['A', 'B', 'C', 'D'].includes(correct_answer.toUpperCase())) {
        return error(res, 'Correct answer must be A, B, C, or D', 400);
      }

      const newQ = db.insert('questions', {
        question_text: question_text.trim(),
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c.trim(),
        option_d: option_d.trim(),
        correct_answer: correct_answer.toUpperCase().trim(),
        marks: Number(marks),
        negative_marks: Number(negative_marks),
        explanation: explanation ? explanation.trim() : '',
        category: category.trim(),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
        event_name: event_name ? event_name.trim() : 'Eloquence 2026',
        round_number: Number(round_number) || 1,
        created_by: req.user.id
      });

      // Link to matching quiz in quiz_questions
      const numRound = Number(round_number) || 1;
      const targetEventName = (event_name || '').trim().toLowerCase();
      const matchingQuiz = req.body.quiz_id
        ? db.find('quizzes', (qz) => qz.id === req.body.quiz_id)
        : db.find('quizzes', (qz) => {
            const matchesRound = Number(qz.round_number) === numRound;
            const matchesEvent = !qz.event_name || qz.event_name.toLowerCase() === targetEventName || qz.title.toLowerCase() === targetEventName;
            return matchesRound && matchesEvent;
          }) || db.find('quizzes', (qz) => Number(qz.round_number) === numRound);

      if (matchingQuiz) {
        const existingLink = db.find('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id && qq.question_id === newQ.id);
        if (!existingLink) {
          const count = db.filter('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id).length;
          db.insert('quiz_questions', {
            quiz_id: matchingQuiz.id,
            question_id: newQ.id,
            display_order: count + 1
          });
        }
      }

      AuditService.log(req.user.id, 'CREATE_QUESTION', 'QUESTION', newQ.id, { category: newQ.category });

      return success(res, newQ, 'Question created successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Update question
   */
  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.correct_answer && !['A', 'B', 'C', 'D'].includes(updates.correct_answer.toUpperCase())) {
        return error(res, 'Correct answer must be A, B, C, or D', 400);
      }

      const updated = db.update('questions', (q) => q.id === id, updates);
      if (!updated) return error(res, 'Question not found', 404);

      AuditService.log(req.user.id, 'UPDATE_QUESTION', 'QUESTION', id, { updates });

      return success(res, updated, 'Question updated successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Duplicate question
   */
  static async duplicateQuestion(req, res) {
    try {
      const { id } = req.params;
      const original = db.find('questions', (q) => q.id === id);
      if (!original) return error(res, 'Original question not found', 404);

      const copy = {
        ...original,
        id: undefined,
        question_text: `${original.question_text} (Copy)`,
        created_at: new Date().toISOString()
      };

      const duplicated = db.insert('questions', copy);
      AuditService.log(req.user.id, 'DUPLICATE_QUESTION', 'QUESTION', duplicated.id, { original_id: id });

      return success(res, duplicated, 'Question duplicated successfully', 201);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Delete question
   */
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const removed = db.remove('questions', (q) => q.id === id);
      if (!removed) return error(res, 'Question not found', 404);

      // Remove from any quiz junctions
      db.remove('quiz_questions', (qq) => qq.question_id === id);

      AuditService.log(req.user.id, 'DELETE_QUESTION', 'QUESTION', id);

      return success(res, {}, 'Question deleted successfully');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Bulk Upload Questions via JSON / CSV Rows
   */
  static async bulkUploadQuestions(req, res) {
    try {
      const { questions = [] } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return error(res, 'No questions provided for bulk upload', 400);
      }

      const inserted = [];
      questions.forEach((q) => {
        const qText = q.question_text ? String(q.question_text).trim() : '';
        const optA = q.option_a ? String(q.option_a).trim() : '';
        const optB = q.option_b ? String(q.option_b).trim() : '';
        const optC = q.option_c ? String(q.option_c).trim() : 'None of the above';
        const optD = q.option_d ? String(q.option_d).trim() : 'All of the above';
        let corrAns = q.correct_answer ? String(q.correct_answer).toUpperCase().trim() : 'A';
        if (!['A', 'B', 'C', 'D'].includes(corrAns)) {
          corrAns = 'A';
        }

        if (qText && optA && optB) {
          const item = db.insert('questions', {
            question_text: qText,
            option_a: optA,
            option_b: optB,
            option_c: optC,
            option_d: optD,
            correct_answer: corrAns,
            marks: Number(q.marks) || 2.0,
            negative_marks: Number(q.negative_marks) || 0.5,
            explanation: q.explanation ? String(q.explanation).trim() : '',
            category: q.category ? String(q.category).trim() : 'General',
            difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
            event_name: q.event_name ? String(q.event_name).trim() : 'Eloquence 2026',
            round_number: Number(q.round_number) || 1,
            created_by: req.user ? req.user.id : 'a0000000-0000-0000-0000-000000000001'
          });
          inserted.push(item);

          // Link to matching quiz in quiz_questions
          const numRound = Number(q.round_number) || 1;
          const targetEvent = (q.event_name || '').trim().toLowerCase();
          const matchingQuiz = req.body.quiz_id
            ? db.find('quizzes', (qz) => qz.id === req.body.quiz_id)
            : db.find('quizzes', (qz) => {
                const matchesRound = Number(qz.round_number) === numRound;
                const matchesEvent = !qz.event_name || qz.event_name.toLowerCase() === targetEvent || qz.title.toLowerCase() === targetEvent;
                return matchesRound && matchesEvent;
              }) || db.find('quizzes', (qz) => Number(qz.round_number) === numRound);

          if (matchingQuiz) {
            const existingLink = db.find('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id && qq.question_id === item.id);
            if (!existingLink) {
              const currentCount = db.filter('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id).length;
              db.insert('quiz_questions', {
                quiz_id: matchingQuiz.id,
                question_id: item.id,
                display_order: currentCount + 1
              });
            }
          }
        }
      });

      AuditService.log(req.user ? req.user.id : 'system', 'BULK_UPLOAD_QUESTIONS', 'QUESTION', 'BATCH', { count: inserted.length });

      return success(res, { count: inserted.length, items: inserted }, `Successfully imported ${inserted.length} questions`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }

  /**
   * Import Questions from Uploaded Document (PDF, PPT, Word, Excel, CSV, JSON, TXT)
   */
  static async importQuestionsFile(req, res) {
    try {
      if (!req.file) {
        return error(res, 'No file uploaded', 400);
      }

      const { event_name = 'Eloquence 2026', round_number = 1, preview_only = 'false', quiz_id } = req.body;
      const originalFilename = req.file.originalname;
      const fileBuffer = req.file.buffer;

      const parsedQuestions = await DocumentParserService.parseDocument(fileBuffer, originalFilename, {
        event_name,
        round_number: Number(round_number) || 1
      });

      if (!parsedQuestions || parsedQuestions.length === 0) {
        return error(
          res,
          'Could not extract any valid MCQ questions from the uploaded file. Please check file formatting.',
          422
        );
      }

      // If preview_only is true, return parsed list without inserting
      if (preview_only === 'true' || preview_only === true) {
        return success(
          res,
          {
            filename: originalFilename,
            count: parsedQuestions.length,
            questions: parsedQuestions
          },
          `Extracted ${parsedQuestions.length} questions from ${originalFilename}`
        );
      }

      // Insert into DB
      const inserted = [];
      const numRound = Number(round_number) || 1;
      const targetEvent = (event_name || '').trim().toLowerCase();
      const matchingQuiz = quiz_id
        ? db.find('quizzes', (qz) => qz.id === quiz_id)
        : db.find('quizzes', (qz) => {
            const matchesRound = Number(qz.round_number) === numRound;
            const matchesEvent = !qz.event_name || qz.event_name.toLowerCase() === targetEvent || qz.title.toLowerCase() === targetEvent;
            return matchesRound && matchesEvent;
          }) || db.find('quizzes', (qz) => Number(qz.round_number) === numRound);

      parsedQuestions.forEach((q) => {
        const item = db.insert('questions', {
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer || 'A',
          marks: Number(q.marks) || 2.0,
          negative_marks: Number(q.negative_marks) || 0.5,
          explanation: q.explanation || '',
          category: q.category || 'General',
          difficulty: q.difficulty || 'Medium',
          event_name: q.event_name || event_name,
          round_number: Number(q.round_number) || numRound,
          created_by: req.user ? req.user.id : 'a0000000-0000-0000-0000-000000000001'
        });
        inserted.push(item);

        if (matchingQuiz) {
          const existingLink = db.find('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id && qq.question_id === item.id);
          if (!existingLink) {
            const currentCount = db.filter('quiz_questions', (qq) => qq.quiz_id === matchingQuiz.id).length;
            db.insert('quiz_questions', {
              quiz_id: matchingQuiz.id,
              question_id: item.id,
              display_order: currentCount + 1
            });
          }
        }
      });

      AuditService.log(req.user ? req.user.id : 'system', 'IMPORT_FILE_QUESTIONS', 'QUESTION', 'BATCH', {
        filename: originalFilename,
        count: inserted.length,
        round_number
      });

      return success(
        res,
        {
          count: inserted.length,
          items: inserted
        },
        `Successfully imported ${inserted.length} questions from ${originalFilename}`,
        201
      );
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = QuestionController;

