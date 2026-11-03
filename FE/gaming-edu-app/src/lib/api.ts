import axios from 'axios';
import Cookies from 'js-cookie';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle expired session (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        Cookies.remove('token');
        Cookies.remove('user');
        
        // Redirect to login if on a protected route
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth?mode=login&expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);
