import api from './api';

export const quizService = {
  getAllQuizzes: async () => {
    const res = await api.get('/quizzes');
    return res.data;
  },

  getQuizById: async (id) => {
    const res = await api.get(`/quizzes/${id}`);
    return res.data;
  },

  createQuiz: async (quizData) => {
    const res = await api.post('/quizzes', quizData);
    return res.data;
  },

  updateQuiz: async (id, quizData) => {
    const res = await api.put(`/quizzes/${id}`, quizData);
    return res.data;
  },

  deleteQuiz: async (id) => {
    const res = await api.delete(`/quizzes/${id}`);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/quizzes/${id}/status`, { status });
    return res.data;
  },

  toggleLateEntry: async (id, allowLateEntry) => {
    const res = await api.patch(`/quizzes/${id}/entry-control`, { allow_late_entry: allowLateEntry });
    return res.data;
  }
};
