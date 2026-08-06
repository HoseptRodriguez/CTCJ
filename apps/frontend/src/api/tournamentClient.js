import {
  createTournamentSchema,
  addTournamentParticipantSchema,
  recordTournamentMatchResultSchema,
} from '@ctcj/shared';

import { request } from './httpClient.js';

export const tournamentClient = {
  /** @returns {Promise<{tournaments: Array}>} public, no auth required, bare list */
  listTournaments: () => request('/api/tournaments'),

  /** @param {string} tournamentId @returns {Promise<{tournament, participants, matches}>} */
  getTournament: (tournamentId) => request(`/api/tournaments/${tournamentId}`),

  /** @param {{name: string, category: string, modality: string}} payload */
  createTournament: (payload) => {
    createTournamentSchema.parse(payload);
    return request('/api/tournaments', { method: 'POST', body: payload });
  },

  /** @param {string} tournamentId @param {string[]} playerIds 1 for SINGLES, 2 for DOBLES */
  addParticipant: (tournamentId, playerIds) => {
    addTournamentParticipantSchema.parse({ playerIds });
    return request(`/api/tournaments/${tournamentId}/participants`, {
      method: 'POST',
      body: { playerIds },
    });
  },

  /** @param {string} tournamentId @param {string} participantId */
  removeParticipant: (tournamentId, participantId) =>
    request(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
      method: 'DELETE',
    }),

  /** @param {string} tournamentId */
  generateDraw: (tournamentId) =>
    request(`/api/tournaments/${tournamentId}/generate-draw`, { method: 'POST' }),

  /**
   * @param {string} tournamentId @param {string} matchId
   * @param {{setsWonA: number, setsWonB: number, winnerSide: string, playedAt: string, notes?: string}} payload
   */
  recordMatchResult: (tournamentId, matchId, payload) => {
    recordTournamentMatchResultSchema.parse(payload);
    return request(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} tournamentId */
  cancelTournament: (tournamentId) =>
    request(`/api/tournaments/${tournamentId}/cancel`, { method: 'POST' }),
};
