import { requestGuardianshipSchema, decideGuardianshipSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const guardianshipClient = {
  /** @param {{ minorEmail: string, canPay: boolean, canBook: boolean }} payload */
  requestGuardianship: (payload) => {
    requestGuardianshipSchema.parse(payload);
    return request('/api/identity/me/guardianships', { method: 'POST', body: payload });
  },

  /**
   * @returns {Promise<{guardianships: Array}>} the caller's own links, as guardian; each
   * with `minorAuthorization: { authorized, authorizedAt, version }`
   */
  listMine: () => request('/api/identity/me/guardianships'),

  /** The guardian authorizes the linked minor's data and image (stored as proof). */
  authorizeMinor: (guardianshipId) =>
    request(`/api/identity/me/guardianships/${guardianshipId}/minor-authorization`, {
      method: 'POST',
    }),

  /** Withdraws it: the minor's account is pending again. */
  withdrawMinorAuthorization: (guardianshipId) =>
    request(`/api/identity/me/guardianships/${guardianshipId}/minor-authorization`, {
      method: 'DELETE',
    }),

  /** @returns {Promise<{isMinor: boolean, pendingGuardianAuthorization: boolean}>} */
  getAccountRestrictions: () => request('/api/identity/me/account-restrictions'),

  /** @param {string} [status] defaults to PENDING server-side */
  listGuardianships: (status) =>
    request('/api/admin/guardianships', { params: status ? { status } : undefined }),

  /** @param {string} guardianshipId @param {{ decision: 'APPROVED'|'REJECTED', notes?: string }} payload */
  decideGuardianship: (guardianshipId, payload) => {
    decideGuardianshipSchema.parse(payload);
    return request(`/api/admin/guardianships/${guardianshipId}/decision`, {
      method: 'PUT',
      body: payload,
    });
  },
};
