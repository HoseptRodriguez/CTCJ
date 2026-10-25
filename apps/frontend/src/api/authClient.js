import { request } from './httpClient.js';

export const authClient = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  verifyEmail: (token) => request('/api/auth/verify', { params: { token } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  refresh: () => request('/api/auth/refresh', { method: 'POST' }),

  // Two-step verification, second step of the sign-in (with the step token).
  /** @param {{ mfaToken: string, code?: string, recoveryCode?: string }} payload */
  mfaVerify: (payload) => request('/api/auth/mfa/verify', { method: 'POST', body: payload }),
  mfaSetupStart: (mfaToken) =>
    request('/api/auth/mfa/setup/start', { method: 'POST', body: { mfaToken } }),
  /** @returns the session and the 10 recovery codes (shown once) */
  mfaSetupConfirm: (mfaToken, code) =>
    request('/api/auth/mfa/setup/confirm', { method: 'POST', body: { mfaToken, code } }),

  /** Always resolves the same way regardless of whether the email exists (no user enumeration). */
  requestPasswordReset: (email) =>
    request('/api/auth/password-reset/request', { method: 'POST', body: { email } }),

  confirmPasswordReset: (payload) =>
    request('/api/auth/password-reset/confirm', { method: 'POST', body: payload }),
};
