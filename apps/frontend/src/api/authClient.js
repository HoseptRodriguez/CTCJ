import { request } from './httpClient.js';

export const authClient = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  verifyEmail: (token) => request('/api/auth/verify', { params: { token } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  refresh: () => request('/api/auth/refresh', { method: 'POST' }),
};
