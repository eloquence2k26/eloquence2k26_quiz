import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach token & exam session header if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const sessionId = sessionStorage.getItem('active_exam_session_id');
    if (sessionId) {
      config.headers['x-exam-session-id'] = sessionId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto logout ONLY on 401 unauthenticated / expired token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRoute = window.location.pathname.includes('/login');
      if (!isLoginRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
