import axios from 'axios';

let rawBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
rawBase = rawBase.trim();

// Normalize Render internal service name or missing protocol
if (rawBase === 'safe-hire-core-api' || rawBase === 'safe-hire-core-api:8000') {
  rawBase = 'https://safe-hire-core-api.onrender.com';
} else if (rawBase && !rawBase.startsWith('http://') && !rawBase.startsWith('https://') && !rawBase.startsWith('/')) {
  rawBase = `https://${rawBase}`;
}

const API_BASE = rawBase.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safe_hire_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
