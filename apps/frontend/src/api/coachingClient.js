import { createNoteSchema, recordPerformanceSnapshotSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const coachingClient = {
  /** @param {string} playerId @param {{ noteType, visibility, content }} payload */
  createNote: (playerId, payload) => {
    createNoteSchema.parse(payload);
    return request(`/api/admin/coaching/players/${playerId}/notes`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} playerId @returns {Promise<{notes: Array}>} every note, both visibilities (staff-facing) */
  listPlayerNotes: (playerId) => request(`/api/admin/coaching/players/${playerId}/notes`),

  /** @returns {Promise<{notes: Array}>} the caller's own PLAYER_VISIBLE notes */
  getMyNotes: () => request('/api/coaching/me/notes'),

  /** @param {string} playerId @param {Record<string, number>} ratings partial map, e.g. { SERVE: 6 } */
  recordPerformanceSnapshot: (playerId, ratings) => {
    recordPerformanceSnapshotSchema.parse({ ratings });
    return request(`/api/admin/coaching/players/${playerId}/performance`, {
      method: 'POST',
      body: { ratings },
    });
  },

  /** @param {string} playerId @returns {Promise<{ratings: Array, summary: object}>} staff-facing full history + derived summary */
  listPlayerPerformance: (playerId) =>
    request(`/api/admin/coaching/players/${playerId}/performance`),

  /** @returns {Promise<{ratings: Array, summary: object}>} the caller's own full history + derived summary */
  getMyPerformance: () => request('/api/coaching/me/performance'),

  /** @param {{limit?: number}} [params] @returns {Promise<{activity: Array}>} club-wide recent notes + ratings, newest-first */
  getRecentActivity: ({ limit } = {}) =>
    request(`/api/admin/coaching/recent-activity${limit ? `?limit=${limit}` : ''}`),
};
