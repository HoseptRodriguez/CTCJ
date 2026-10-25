import {
  scheduleAppointmentSchema,
  cancelAppointmentSchema,
  createClinicalNoteSchema,
  createRecoveryPlanSchema,
  discontinueRecoveryPlanSchema,
  createMedicalHistoryEntrySchema,
  setFitnessStatusSchema,
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

  // Phase 15 (Physiotherapy) -- Fisioterapeuta-only, no Psychology equivalent.

  /** @param {string} playerId @param {{title, goal?, visibility}} payload */
  createRecoveryPlan: (playerId, payload) => {
    createRecoveryPlanSchema.parse(payload);
    return request(`/api/admin/clinical/players/${playerId}/recovery-plans`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} playerId @returns {Promise<{plans: Array}>} */
  listRecoveryPlans: (playerId) =>
    request(`/api/admin/clinical/players/${playerId}/recovery-plans`),

  /** @param {string} planId */
  completeRecoveryPlan: (planId) =>
    request(`/api/admin/clinical/recovery-plans/${planId}/complete`, { method: 'POST' }),

  /** @param {string} planId @param {string} reason */
  discontinueRecoveryPlan: (planId, reason) => {
    discontinueRecoveryPlanSchema.parse({ reason });
    return request(`/api/admin/clinical/recovery-plans/${planId}/discontinue`, {
      method: 'POST',
      body: { reason },
    });
  },

  /** @param {string} playerId @param {{condition, description?, visibility, occurredAt?}} payload */
  createMedicalHistoryEntry: (playerId, payload) => {
    createMedicalHistoryEntrySchema.parse(payload);
    return request(`/api/admin/clinical/players/${playerId}/medical-history`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} playerId @returns {Promise<{entries: Array}>} */
  listMedicalHistory: (playerId) =>
    request(`/api/admin/clinical/players/${playerId}/medical-history`),

  /** @param {string} entryId */
  resolveMedicalHistoryEntry: (entryId) =>
    request(`/api/admin/clinical/medical-history/${entryId}/resolve`, { method: 'POST' }),

  /** @returns {Promise<{plans: Array}>} the caller's own PLAYER_VISIBLE recovery plans */
  getMyRecoveryPlans: () => request('/api/clinical/me/recovery-plans'),

  /** @returns {Promise<{entries: Array}>} the caller's own PLAYER_VISIBLE medical history */
  getMyMedicalHistory: () => request('/api/clinical/me/medical-history'),

  // --- Administration's access to Physiotherapy ----------------------------

  /** Admin/physio: appointments, attendance, active plan, "Apto / No apto" -- no clinical text. */
  getPhysioSummary: (playerId) => request(`/api/admin/clinical/players/${playerId}/physio-summary`),

  /** Physio: @param {{ status: 'FIT'|'UNFIT', unfitUntil?: string }} payload */
  setFitnessStatus: (playerId, payload) => {
    setFitnessStatusSchema.parse(payload);
    return request(`/api/admin/clinical/players/${playerId}/fitness-status`, {
      method: 'POST',
      body: payload,
    });
  },

  /** Admin: physiotherapy notes -- 403 unless the player authorized it; every read is audited. */
  listPhysioNotesForAdmin: (playerId) =>
    request(`/api/admin/clinical/players/${playerId}/physio-notes`),

  /** The caller's own authorization for the administration to read their physio notes. */
  getMyPhysioConsent: () => request('/api/clinical/me/consents/admin-physio-notes'),
  grantMyPhysioConsent: () =>
    request('/api/clinical/me/consents/admin-physio-notes', { method: 'POST' }),
  revokeMyPhysioConsent: () =>
    request('/api/clinical/me/consents/admin-physio-notes', { method: 'DELETE' }),
};
