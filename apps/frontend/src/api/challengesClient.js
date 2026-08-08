import { createChallengeSchema, submitMatchScoreSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const challengesClient = {
  /** @param {{opponentUserId: string, message?: string}} payload */
  createChallenge: (payload) => {
    createChallengeSchema.parse(payload);
    return request('/api/challenges/me', { method: 'POST', body: payload });
  },

  /** @returns {Promise<{challenges: Array}>} every challenge the caller is party to */
  getMyChallenges: () => request('/api/challenges/me'),

  /** @param {string} challengeId */
  acceptChallenge: (challengeId) =>
    request(`/api/challenges/me/${challengeId}/accept`, { method: 'POST' }),

  /** @param {string} challengeId */
  rejectChallenge: (challengeId) =>
    request(`/api/challenges/me/${challengeId}/reject`, { method: 'POST' }),

  /** @param {string} challengeId */
  cancelChallenge: (challengeId) =>
    request(`/api/challenges/me/${challengeId}/cancel`, { method: 'POST' }),

  /** @param {string} challengeId
   * @param {{category: string, mySetsWon: number, opponentSetsWon: number, playedAt: string}} payload */
  submitMatchScore: (challengeId, payload) => {
    submitMatchScoreSchema.parse(payload);
    return request(`/api/challenges/me/${challengeId}/score`, { method: 'POST', body: payload });
  },
};
