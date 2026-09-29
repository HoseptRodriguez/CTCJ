import { request } from './httpClient.js';

/** "Solicitar información": the public form and the front desk's inbox. */
export const infoRequestClient = {
  /** A signed token for the anti-spam check; asked when the form appears. */
  getFormToken: () => request('/api/info-requests/form-token'),
  submit: (payload) => request('/api/info-requests', { method: 'POST', body: payload }),

  list: (params = {}) =>
    request('/api/admin/info-requests', {
      params: Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
    }),
  countNew: () => request('/api/admin/info-requests/count-new'),
  setStatus: (id, status) =>
    request(`/api/admin/info-requests/${id}/status`, { method: 'PUT', body: { status } }),
  addNote: (id, text) =>
    request(`/api/admin/info-requests/${id}/notes`, { method: 'POST', body: { text } }),
};
