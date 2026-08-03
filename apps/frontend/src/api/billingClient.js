import {
  createPlanSchema,
  setPlanPriceSchema,
  enrollPlayerSchema,
  setPlayerMembershipStatusSchema,
  addAdjustmentSchema,
} from '@ctcj/shared';

import { request } from './httpClient.js';

export const billingClient = {
  /** @returns {Promise<{plans: Array}>} each with currentPriceCop attached */
  listPlans: () => request('/api/admin/billing/plans'),

  /** @param {{ code: string, name: string, description?: string }} payload */
  createPlan: (payload) => {
    createPlanSchema.parse(payload);
    return request('/api/admin/billing/plans', { method: 'POST', body: payload });
  },

  /** @param {string} planId @returns {Promise<{prices: Array}>} full history, newest first */
  listPlanPrices: (planId) => request(`/api/admin/billing/plans/${planId}/prices`),

  /** @param {string} planId @param {{ basePriceCop: number, validFrom: string }} payload validFrom is YYYY-MM-DD */
  setPlanPrice: (planId, payload) => {
    setPlanPriceSchema.parse(payload);
    return request(`/api/admin/billing/plans/${planId}/price`, { method: 'PUT', body: payload });
  },

  /** @param {{ playerId, planId, startDate, billingDay, frequency? }} payload */
  enrollPlayer: (payload) => {
    enrollPlayerSchema.parse(payload);
    return request('/api/admin/billing/memberships', { method: 'POST', body: payload });
  },

  /** @param {string} playerId @returns {Promise<{memberships: Array}>} each enriched with planName + currentPriceCop */
  listMemberships: (playerId) =>
    request('/api/admin/billing/memberships', { params: { playerId } }),

  /** @param {string} membershipId @param {{ status: 'ACTIVE'|'SUSPENDED'|'ENDED' }} payload */
  setMembershipStatus: (membershipId, payload) => {
    setPlayerMembershipStatusSchema.parse(payload);
    return request(`/api/admin/billing/memberships/${membershipId}/status`, {
      method: 'PUT',
      body: payload,
    });
  },

  /** @param {string} membershipId @param {{ adjustmentType, value, reason, validFrom, validTo? }} payload */
  addAdjustment: (membershipId, payload) => {
    addAdjustmentSchema.parse(payload);
    return request(`/api/admin/billing/memberships/${membershipId}/adjustments`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} membershipId @returns {Promise<{adjustments: Array}>} */
  listAdjustments: (membershipId) =>
    request(`/api/admin/billing/memberships/${membershipId}/adjustments`),

  /** @returns {Promise<{memberships: Array}>} the caller's own memberships */
  getMyMemberships: () => request('/api/billing/me/memberships'),
};
