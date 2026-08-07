import {
  createPlanSchema,
  setPlanPriceSchema,
  enrollPlayerSchema,
  setPlayerMembershipStatusSchema,
  addAdjustmentSchema,
  generateInvoiceSchema,
  recordInvoicePaymentSchema,
  cancelInvoiceSchema,
  listInvoicesQuerySchema,
  invoicesMonthlyQuerySchema,
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

  /** @param {string} membershipId @param {{ periodStart, periodEnd, dueDate }} payload YYYY-MM-DD dates */
  generateInvoice: (membershipId, payload) => {
    generateInvoiceSchema.parse(payload);
    return request(`/api/admin/billing/memberships/${membershipId}/invoices`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} membershipId @returns {Promise<{invoices: Array}>} */
  listInvoices: (membershipId) =>
    request(`/api/admin/billing/memberships/${membershipId}/invoices`),

  /** @param {string} invoiceId @returns {Promise<object>} the invoice with its lines */
  getInvoice: (invoiceId) => request(`/api/admin/billing/invoices/${invoiceId}`),

  /** @param {string} invoiceId @param {{ method: string, notes?: string }} payload */
  recordInvoicePayment: (invoiceId, payload) => {
    recordInvoicePaymentSchema.parse(payload);
    return request(`/api/admin/billing/invoices/${invoiceId}/payment`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @param {string} invoiceId @param {{ reason: string }} payload */
  cancelInvoice: (invoiceId, payload) => {
    cancelInvoiceSchema.parse(payload);
    return request(`/api/admin/billing/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      body: payload,
    });
  },

  /** @returns {Promise<{invoices: Array}>} the caller's own invoices */
  getMyInvoices: () => request('/api/billing/me/invoices'),

  /**
   * Club-wide listing for the financial dashboard (Phase 9) -- distinct from
   * listInvoices(membershipId) above, which is scoped to one membership.
   * @param {{ status?: 'PENDING'|'PAID'|'CANCELLED', from?: string, to?: string }} params
   * @returns {Promise<{invoices: Array, totalCop: number, count: number}>}
   */
  listInvoicesClubWide: (params) => {
    listInvoicesQuerySchema.parse(params);
    // request() puts every entry verbatim into the query string, including
    // literal "undefined" for an unset key -- strip those before sending.
    const definedParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    );
    return request('/api/admin/billing/invoices', { params: definedParams });
  },

  /**
   * Cash flow (financial dashboard) -- membership revenue actually
   * collected, grouped by club-local month, oldest first.
   * @param {{ months?: number }} params
   * @returns {Promise<{months: Array<{month: string, totalCop: number, count: number}>}>}
   */
  getMonthlyRevenue: (params = {}) => {
    invoicesMonthlyQuerySchema.parse(params);
    const definedParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    );
    return request('/api/admin/billing/invoices/monthly', { params: definedParams });
  },
};
