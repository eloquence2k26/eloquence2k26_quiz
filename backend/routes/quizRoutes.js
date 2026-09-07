import express from 'express';
import { 
  getQuizzesFromDB, 
  insertQuizToDB, 
  updateQuizInDB, 
  deleteQuizFromDB, 
  updateQuizScheduleInDB,
  addQuestionToQuizInDB, 
  updateQuestionInQuizInDB,
  deleteQuestionFromQuizInDB 
} from '../config/db.js';

const router = express.Router();

// GET /api/quizzes - Fetch all event quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await getQuizzesFromDB();
    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quizzes - Create a new event quiz
router.post('/', async (req, res) => {
  try {
    const { title, category, duration, total_marks, status, start_time, end_time } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }

    const newQuiz = await insertQuizToDB({
      title,
      category: category || 'General Technology',
      duration: duration || 30,
      total_marks: total_marks || 100,
      status: status || 'Active',
      start_time: start_time || null,
      end_time: end_time || null,
      questions: []
    });

    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quizzes/:id - Edit event quiz metadata
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, duration, total_marks, status, start_time, end_time } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (duration !== undefined) updates.duration = parseInt(duration, 10);
    if (total_marks !== undefined) updates.total_marks = parseInt(total_marks, 10);
    if (status !== undefined) updates.status = status;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;

    const updatedQuiz = await updateQuizInDB(id, updates);
    if (updatedQuiz) {
      return res.json({ success: true, quiz: updatedQuiz });
    }

    res.status(404).json({ error: 'Quiz not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quizzes/:id/schedule - Configure start & end timing for quiz
router.put('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Both start_time and end_time are required to schedule quiz' });
    }

    const updatedQuiz = await updateQuizScheduleInDB(id, start_time, end_time);
    if (updatedQuiz) {
      return res.json({ success: true, quiz: updatedQuiz });
    }

    res.status(404).json({ error: 'Quiz not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quizzes/:id - Remove an event quiz
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQuizFromDB(id);
    res.json({ success: true, message: 'Event Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quizzes/:id/questions - Add question to specific event quiz
router.post('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt, questionText, optionA, optionB, optionC, optionD, correctOption, points } = req.body;

    const finalPrompt = prompt || questionText;
    if (!finalPrompt || !optionA || !optionB || !optionC || !optionD) {
      return res.status(400).json({ error: 'Question statement and all 4 options are required' });
    }

    const result = await addQuestionToQuizInDB(id, {
      prompt: finalPrompt,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: correctOption || 'A',
      points: points || 10
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quizzes/:id/questions/:questionId - Edit question inside event quiz
router.put('/:id/questions/:questionId', async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const { prompt, optionA, optionB, optionC, optionD, correctOption, points } = req.body;

    const updates = {};
    if (prompt !== undefined) updates.prompt = prompt;
    if (optionA !== undefined) updates.optionA = optionA;
    if (optionB !== undefined) updates.optionB = optionB;
    if (optionC !== undefined) updates.optionC = optionC;
    if (optionD !== undefined) updates.optionD = optionD;
    if (correctOption !== undefined) updates.correctOption = correctOption;
    if (points !== undefined) updates.points = parseInt(points, 10);

    const result = await updateQuestionInQuizInDB(id, questionId, updates);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quizzes/:id/questions/:questionId - Remove a question from event quiz
router.delete('/:id/questions/:questionId', async (req, res) => {
  try {
    const { id, questionId } = req.params;
    const updatedQuiz = await deleteQuestionFromQuizInDB(id, questionId);
    res.json({ success: true, quiz: updatedQuiz });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
