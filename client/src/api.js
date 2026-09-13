import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Health check
export const checkHealth = () => api.get('/health');

// Voices
export const getVoices = (page = 1, limit = 50, language = '') => {
  const params = new URLSearchParams({ page, limit });
  if (language) params.append('language', language);
  return api.get(`/voices?${params}`);
};

export const getVoiceById = (id) => api.get(`/voices/${id}`);

// TTS
export const generateSpeech = (data) => api.post('/tts/synthesize', data);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);

// History
export const getHistory = (page = 1, limit = 10) => {
  const params = new URLSearchParams({ page, limit });
  return api.get(`/history?${params}`);
};
export const getHistoryById = (id) => api.get(`/history/${id}`);
export const createHistory = (data) => api.post('/history', data);
export const deleteHistory = (id) => api.delete(`/history/${id}`);

// Favorites
export const getFavorites = () => api.get('/favorites');
export const addFavorite = (data) => api.post('/favorites', data);
export const removeFavorite = (id) => api.delete(`/favorites/${id}`);

// Preferences
export const getPreferences = () => api.get('/preferences');
export const updatePreferences = (data) => api.put('/preferences', data);

// Auth helpers
export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => !!localStorage.getItem('token');

export default api;
