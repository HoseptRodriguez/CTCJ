import { createNoteSchema } from '@ctcj/shared';

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
};
