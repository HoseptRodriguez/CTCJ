import { createGoalSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const goalsClient = {
  /** @param {{title, metricType, targetArea?, targetValue?, targetCategory?, targetModality?}} payload */
  createGoal: (payload) => {
    createGoalSchema.parse(payload);
    return request('/api/goals/me', { method: 'POST', body: payload });
  },

  /** @returns {Promise<{goals: Array}>} the caller's own goals, with live-computed progress */
  getMyGoals: () => request('/api/goals/me'),

  /** @param {string} goalId */
  abandonGoal: (goalId) => request(`/api/goals/me/${goalId}/abandon`, { method: 'POST' }),
};
