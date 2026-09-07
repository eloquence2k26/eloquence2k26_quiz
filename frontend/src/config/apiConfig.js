const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const formatBaseUrl = (url) => {
  if (!url) return 'http://localhost:5001';
  let formatted = String(url).trim().replace(/\/+$/, '');
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

export const API_BASE_URL = formatBaseUrl(rawBaseUrl);

export const API_URL = `${API_BASE_URL}/api/users`;
export const API_ADMIN_URL = `${API_BASE_URL}/api/admin`;
export const API_PARTICIPANT_URL = `${API_BASE_URL}/api/participant`;

