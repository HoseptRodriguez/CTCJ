import { requestGuardianshipSchema, decideGuardianshipSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const guardianshipClient = {
  /** @param {{ minorEmail: string, canPay: boolean, canBook: boolean }} payload */
  requestGuardianship: (payload) => {
    requestGuardianshipSchema.parse(payload);
    return request('/api/identity/me/guardianships', { method: 'POST', body: payload });
  },

  /** @returns {Promise<{guardianships: Array}>} the caller's own links, as guardian */
  listMine: () => request('/api/identity/me/guardianships'),

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
