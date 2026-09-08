import api from './api';

export const examService = {
  startExam: async (quizId) => {
    const res = await api.post(`/exams/${quizId}/start`);
    if (res.data?.data?.sessionId) {
      sessionStorage.setItem('active_exam_session_id', res.data.data.sessionId);
    }
    return res.data;
  },

  saveAnswer: async (attemptId, questionId, selectedOption, isMarkedForReview) => {
    const res = await api.post(`/exams/attempts/${attemptId}/answers`, {
      question_id: questionId,
      selected_option: selectedOption,
      is_marked_for_review: isMarkedForReview
    });
    return res.data;
  },

  recordSecurityEvent: async (attemptId, violationType, description, metadata = {}) => {
    const res = await api.post(`/exams/attempts/${attemptId}/security-event`, {
      violation_type: violationType,
      description,
      metadata
    });
    return res.data;
  },

  submitExam: async (attemptId) => {
    const res = await api.post(`/exams/attempts/${attemptId}/submit`);
    sessionStorage.removeItem('active_exam_session_id');
    return res.data;
  },

  getLiveMonitoring: async (quizId) => {
    const res = await api.get(`/exams/live/${quizId}`);
    return res.data;
  },

  adminTerminateAttempt: async (attemptId, reason) => {
    const res = await api.post(`/exams/attempts/${attemptId}/admin-terminate`, { reason });
    return res.data;
  },

  adminExtendTime: async (attemptId, extraMinutes) => {
    const res = await api.post(`/exams/attempts/${attemptId}/extend-time`, { extra_minutes: extraMinutes });
    return res.data;
  },

  getAttemptResult: async (attemptId) => {
    const res = await api.get(`/results/attempt/${attemptId}`);
    return res.data;
  },

  getQuizResults: async (quizId, filters = {}) => {
    const res = await api.get(`/results/quiz/${quizId}`, { params: filters });
    return res.data;
  }
};
