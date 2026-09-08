const db = require('../config/db');
const { success, error } = require('../utils/responseHelper');
const AuditService = require('../services/auditService');

class QuestionController {
  /**
   * Get all questions (Admin only)
   */
  static async getAllQuestions(req, res) {
    try {
      const { category, difficulty, search } = req.query;
      let questions = db.get('questions');

      if (category) {
        questions = questions.filter((q) => q.category && q.category.toLowerCase() === category.toLowerCase());
      }
      if (difficulty) {
        questions = questions.filter((q) => q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase());
      }
      if (search) {
        const term = search.toLowerCase();
        questions = questions.filter((q) =>
          q.question_text.toLowerCase().includes(term) ||
          (q.category && q.category.toLowerCase().includes(term))
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
        difficulty = 'Medium'
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
        created_by: req.user.id
      });

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
        if (q.question_text && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_answer) {
          const item = db.insert('questions', {
            question_text: q.question_text.trim(),
            option_a: q.option_a.trim(),
            option_b: q.option_b.trim(),
            option_c: q.option_c.trim(),
            option_d: q.option_d.trim(),
            correct_answer: q.correct_answer.toUpperCase().trim(),
            marks: Number(q.marks) || 1.0,
            negative_marks: Number(q.negative_marks) || 0.0,
            explanation: q.explanation ? q.explanation.trim() : '',
            category: q.category ? q.category.trim() : 'General',
            difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
            created_by: req.user.id
          });
          inserted.push(item);
        }
      });

      AuditService.log(req.user.id, 'BULK_UPLOAD_QUESTIONS', 'QUESTION', 'BATCH', { count: inserted.length });

      return success(res, { count: inserted.length, items: inserted }, `Successfully imported ${inserted.length} questions`);
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
}

module.exports = QuestionController;
