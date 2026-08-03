import { requestAffiliationSchema, decideAffiliationRequestSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const affiliationClient = {
  /** @param {{ notes?: string }} payload */
  submitRequest: (payload = {}) => {
    requestAffiliationSchema.parse(payload);
    return request('/api/identity/me/affiliation-requests', { method: 'POST', body: payload });
  },

  /** @returns {Promise<{requests: Array}>} the caller's own affiliation requests, newest first */
  getMyRequests: () => request('/api/identity/me/affiliation-requests'),

  /** @param {string} [status] defaults to PENDING server-side */
  listRequests: (status) =>
    request('/api/admin/affiliation-requests', { params: status ? { status } : undefined }),

  /** @param {string} requestId @param {{ decision: 'APPROVED'|'REJECTED', notes?: string }} payload */
  decideRequest: (requestId, payload) => {
    decideAffiliationRequestSchema.parse(payload);
    return request(`/api/admin/affiliation-requests/${requestId}/decision`, {
      method: 'PUT',
      body: payload,
    });
  },
};
