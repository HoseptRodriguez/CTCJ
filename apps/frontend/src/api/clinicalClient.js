import {
  scheduleAppointmentSchema,
  cancelAppointmentSchema,
  createClinicalNoteSchema,
} from '@ctcj/shared';

import { request } from './httpClient.js';

// request() puts every entry verbatim into the query string, including
// literal "undefined" for an unset key -- strip those before sending,
// matching billingClient's listInvoicesClubWide precedent.
function definedParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

export const clinicalClient = {
  /** @param {{playerId: string, practitionerId: string, start: string, end: string}} payload ISO-8601 strings with offset */
  scheduleAppointment: (payload) => {
    scheduleAppointmentSchema.parse(payload);
    return request('/api/admin/clinical/appointments', { method: 'POST', body: payload });
  },

  /** @param {string} appointmentId @param {string} reason */
  cancelAppointment: (appointmentId, reason) => {
    cancelAppointmentSchema.parse({ reason });
    return request(`/api/admin/clinical/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  },

  /** @param {string} appointmentId */
  markCompleted: (appointmentId) =>
    request(`/api/admin/clinical/appointments/${appointmentId}/complete`, { method: 'POST' }),

  /** @param {string} appointmentId */
  markNoShow: (appointmentId) =>
    request(`/api/admin/clinical/appointments/${appointmentId}/no-show`, { method: 'POST' }),

  /** @param {{playerId?: string, practitionerId?: string}} params @returns {Promise<{appointments: Array}>} */
  listAppointments: (params = {}) =>
    request('/api/admin/clinical/appointments', { params: definedParams(params) }),

  /** @param {string} playerId @param {{noteType, visibility, content, appointmentId?}} payload */
  createNote: (playerId, payload) => {
    createClinicalNoteSchema.parse(payload);
    return request(`/api/admin/clinical/players/${playerId}/notes`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} playerId @returns {Promise<{notes: Array}>} every note, both visibilities (practitioner-facing) */
  listPlayerNotes: (playerId) => request(`/api/admin/clinical/players/${playerId}/notes`),

  /** @returns {Promise<{appointments: Array}>} the caller's own appointments */
  getMyAppointments: () => request('/api/clinical/me/appointments'),

  /** @returns {Promise<{notes: Array}>} the caller's own PLAYER_VISIBLE notes */
  getMyNotes: () => request('/api/clinical/me/notes'),
};
