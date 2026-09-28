import { answerDataRequestSchema, submitDataRequestSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const privacyClient = {
  /** Everything the club keeps about me, as JSON. */
  exportMyData: () => request('/api/privacy/me/export'),

  listMyDataRequests: () => request('/api/privacy/me/requests'),

  /** @param {{ kind: string, description: string }} payload */
  submitDataRequest: (payload) => {
    submitDataRequestSchema.parse(payload);
    return request('/api/privacy/me/requests', { method: 'POST', body: payload });
  },

  /** The administration's inbox. */
  listDataRequests: ({ openOnly = false } = {}) =>
    request('/api/admin/privacy/requests', openOnly ? { params: { open: 'true' } } : {}),

  /** @param {string} id @param {{ status: string, answer?: string, eraseAccount?: boolean }} payload */
  answerDataRequest: (id, payload) => {
    answerDataRequestSchema.parse(payload);
    return request(`/api/admin/privacy/requests/${id}/answer`, { method: 'POST', body: payload });
  },
};
