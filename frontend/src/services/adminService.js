import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const res = await api.get('/admin/dashboard-stats');
    return res.data;
  },

  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await api.put('/admin/settings', settings);
    return res.data;
  },

  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },

  // Questions
  getQuestions: async (params = {}) => {
    const res = await api.get('/questions', { params });
    return res.data;
  },

  createQuestion: async (questionData) => {
    const res = await api.post('/questions', questionData);
    return res.data;
  },

  updateQuestion: async (id, questionData) => {
    const res = await api.put(`/questions/${id}`, questionData);
    return res.data;
  },

  duplicateQuestion: async (id) => {
    const res = await api.post(`/questions/${id}/duplicate`);
    return res.data;
  },

  deleteQuestion: async (id) => {
    const res = await api.delete(`/questions/${id}`);
    return res.data;
  },

  bulkUploadQuestions: async (questions) => {
    const res = await api.post('/questions/bulk', { questions });
    return res.data;
  },

  importQuestionsFile: async (formData) => {
    const res = await api.post('/questions/import-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Participants
  getParticipants: async (params = {}) => {
    const res = await api.get('/participants', { params });
    return res.data;
  },

  createParticipant: async (participantData) => {
    const res = await api.post('/participants', participantData);
    return res.data;
  },

  bulkImportParticipants: async (participants) => {
    const res = await api.post('/participants/bulk-import', { participants });
    return res.data;
  },

  toggleDisableParticipant: async (id, is_disabled) => {
    const res = await api.patch(`/participants/${id}/status`, { is_disabled });
    return res.data;
  },

  deleteParticipant: async (id) => {
    const res = await api.delete(`/participants/${id}`);
    return res.data;
  },

  updateParticipant: async (id, participantData) => {
    const res = await api.put(`/participants/${id}`, participantData);
    return res.data;
  },

  assignParticipantsToQuiz: async (quizId, participantIds, assignAll = false) => {
    const res = await api.post('/participants/assign', {
      quiz_id: quizId,
      participant_ids: participantIds,
      assign_all: assignAll
    });
    return res.data;
  },

  importParticipantsFile: async (formData) => {
    const res = await api.post('/participants/import-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Events Management
  getEvents: async () => {
    const res = await api.get('/admin/events');
    return res.data;
  },

  createEvent: async (eventData) => {
    const res = await api.post('/admin/events', eventData);
    return res.data;
  },

  updateEvent: async (id, eventData) => {
    const res = await api.put(`/admin/events/${id}`, eventData);
    return res.data;
  },

  deleteEvent: async (id) => {
    const res = await api.delete(`/admin/events/${id}`);
    return res.data;
  },

  // Rounds Management
  getRounds: async () => {
    const res = await api.get('/rounds');
    return res.data;
  },

  createRound: async (roundData) => {
    const res = await api.post('/rounds', roundData);
    return res.data;
  },

  updateRound: async (id, roundData) => {
    const res = await api.put(`/rounds/${id}`, roundData);
    return res.data;
  },

  deleteRound: async (id, force = false) => {
    const res = await api.delete(`/rounds/${id}${force ? '?force=true' : ''}`);
    return res.data;
  },

  // Round 1 -> Round 2 Selection
  getRound1Ranking: async () => {
    const res = await api.get('/rounds/round1-ranking');
    return res.data;
  },

  autoSelectTopN: async (topN, quizId) => {
    const res = await api.post('/rounds/auto-select-top-n', { top_n: topN, quiz_id: quizId });
    return res.data;
  },

  toggleParticipantSelection: async (participantId, selected, roundNumber = 1) => {
    const res = await api.post('/rounds/toggle-selection', {
      participant_id: participantId,
      selected,
      round_number: roundNumber
    });
    return res.data;
  },

  publishRoundSelection: async (roundNumber = 1) => {
    const res = await api.post('/rounds/publish-selection', { round_number: roundNumber });
    return res.data;
  },

  getParticipantRoundStatus: async () => {
    const res = await api.get('/rounds/participant-status');
    return res.data;
  },

  // Violations & Announcements
  getViolations: async (params = {}) => {
    const res = await api.get('/security/violations', { params });
    return res.data;
  },

  getViolationStats: async () => {
    const res = await api.get('/security/stats');
    return res.data;
  },

  getAnnouncements: async () => {
    const res = await api.get('/announcements');
    return res.data;
  },

  createAnnouncement: async (announcementData) => {
    const res = await api.post('/announcements', announcementData);
    return res.data;
  },

  deleteAnnouncement: async (id) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  },

  // Results & Publishing Lifecycle
  getEventOverview: async (quizId) => {
    const res = await api.get(`/results/overview/${quizId}`);
    return res.data;
  },

  publishAllResults: async (quizId, publish = true) => {
    const res = await api.post(`/results/publish/${quizId}`, { publish });
    return res.data;
  },

  sendSelectiveResults: async (quizId, participantIds, sendStatus = true) => {
    const res = await api.post(`/results/send-selective/${quizId}`, {
      participant_ids: participantIds,
      send_status: sendStatus
    });
    return res.data;
  },

  // Export reports
  exportQuizResultsCSV: async (quizId) => {
    const res = await api.get(`/reports/quiz-results/${quizId}/csv`);
    return res.data;
  },

  exportParticipantsCSV: async () => {
    const res = await api.get('/reports/participants/csv');
    return res.data;
  },

  // Exam Attempt Management & Restarts
  getAllExamAttempts: async (params = {}) => {
    const res = await api.get('/exam/admin/all-attempts', { params });
    return res.data;
  },

  restartExamAttempt: async (attemptId) => {
    const res = await api.post(`/exam/attempts/${attemptId}/admin-restart`);
    return res.data;
  }
};
