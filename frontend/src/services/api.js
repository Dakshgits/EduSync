import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // the JWT lives in an httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('edusync:unauthorized')); // token expired / invalid
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (e) =>
  e?.response?.data?.error?.message || (e?.request ? 'Cannot reach the server. Check that the backend is running.' : e?.message || 'Something went wrong');
export const fieldErrors = (e) => e?.response?.data?.error?.details || {};

export default api;
