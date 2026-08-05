import {
  createSeasonSchema,
  recordMatchSchema,
  voidMatchSchema,
  standingsQuerySchema,
  matchesQuerySchema,
} from '@ctcj/shared';

import { request } from './httpClient.js';

// request() puts every entry verbatim into the query string, including
// literal "undefined" for an unset key -- strip those before sending,
// matching billingClient's listInvoicesClubWide precedent.
function definedParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

export const competitionClient = {
  /** @returns {Promise<{seasons: Array}>} public, no auth required */
  listSeasons: () => request('/api/competition/seasons'),

  /** @param {{name: string, year: number, seasonNumber: number, startDate: string}} payload */
  createSeason: (payload) => {
    createSeasonSchema.parse(payload);
    return request('/api/competition/seasons', { method: 'POST', body: payload });
  },

  /** @param {string} seasonId */
  closeSeason: (seasonId) =>
    request(`/api/competition/seasons/${seasonId}/close`, { method: 'POST' }),

  /** @param {{seasonId?: string, category: string, modality: string}} params seasonId omitted = current OPEN season */
  getStandings: (params) => {
    standingsQuerySchema.parse(params);
    return request('/api/competition/standings', { params: definedParams(params) });
  },

  /** @param {{seasonId?: string, category: string, modality: string, playerId?: string}} params */
  listMatches: (params) => {
    matchesQuerySchema.parse(params);
    return request('/api/competition/matches', { params: definedParams(params) });
  },

  /**
   * @param {{seasonId: string, category: string, modality: string, participantsA: string[],
   *   participantsB: string[], winnerSide: string, setsWonA: number, setsWonB: number,
   *   playedAt: string, notes?: string}} payload
   */
  recordMatch: (payload) => {
    recordMatchSchema.parse(payload);
    return request('/api/competition/matches', { method: 'POST', body: payload });
  },

  /** @param {string} matchId @param {string} reason */
  voidMatch: (matchId, reason) => {
    voidMatchSchema.parse({ reason });
    return request(`/api/competition/matches/${matchId}/void`, {
      method: 'POST',
      body: { reason },
    });
  },
};
