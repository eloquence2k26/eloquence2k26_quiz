import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Lightweight short-TTL cache & in-flight request deduplication map
const requestCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 3000; // 3 seconds cache for read-only GET requests

// Endpoints that should NEVER be cached
const UNCACHABLE_PATTERNS = [
  '/auth/me',
  '/auth/login',
  '/exam/start',
  '/exam/submit',
  '/exam/heartbeat',
  '/exam/session',
  '/security/violation'
];

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

    // Invalidate cache on mutations
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get') {
      requestCache.clear();
      inFlightRequests.clear();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto logout ONLY on 401, handle deduplication and caching
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';

    // Cache safe GET requests
    if (method === 'get') {
      const isUncachable = UNCACHABLE_PATTERNS.some((p) => url.includes(p));
      const isExplicitNoCache = config.params && config.params._refresh;

      if (!isUncachable && !isExplicitNoCache) {
        const cacheKey = `${url}?${JSON.stringify(config.params || {})}`;
        requestCache.set(cacheKey, {
          timestamp: Date.now(),
          data: response
        });
      }
    }

    return response;
  },
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

// Custom GET wrapper with deduplication and caching
const originalGet = api.get;
api.get = function (url, config = {}) {
  const isUncachable = UNCACHABLE_PATTERNS.some((p) => url.includes(p));
  const isExplicitNoCache = config.params && config.params._refresh;

  if (isUncachable || isExplicitNoCache) {
    return originalGet.call(api, url, config);
  }

  const cacheKey = `${url}?${JSON.stringify(config.params || {})}`;
  const now = Date.now();

  // 1. Return cached response if valid (within 3 seconds)
  if (requestCache.has(cacheKey)) {
    const entry = requestCache.get(cacheKey);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return Promise.resolve(entry.data);
    }
    requestCache.delete(cacheKey);
  }

  // 2. Reuse in-flight request if identical request is pending
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Initiate request and record in-flight promise
  const promise = originalGet
    .call(api, url, config)
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

export default api;
