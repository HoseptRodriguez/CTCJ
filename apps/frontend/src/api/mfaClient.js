import { request } from './httpClient.js';

/** Two-step verification from a signed-in session (Mi perfil). */
export const mfaClient = {
  /** @returns {Promise<{ enabled: boolean, required: boolean, recoveryCodesLeft: number }>} */
  getStatus: () => request('/api/identity/me/mfa'),
  startSetup: () => request('/api/identity/me/mfa/setup/start', { method: 'POST' }),
  /** @returns {Promise<{ recoveryCodes: string[] }>} shown once */
  confirmSetup: (code) =>
    request('/api/identity/me/mfa/setup/confirm', { method: 'POST', body: { code } }),
  disable: (code) => request('/api/identity/me/mfa/disable', { method: 'POST', body: { code } }),
  regenerateRecoveryCodes: (code) =>
    request('/api/identity/me/mfa/recovery-codes', { method: 'POST', body: { code } }),
};
