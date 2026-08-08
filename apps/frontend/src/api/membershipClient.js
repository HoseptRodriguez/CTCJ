import {
  setMembershipStatusSchema,
  lookupUserQuerySchema,
  overduePolicySchema,
} from '@ctcj/shared';

import { request } from './httpClient.js';

export const membershipClient = {
  /** @param {string} email @returns {Promise<{id, email, firstName, lastName, roleCodes, membershipStatus}>} */
  lookupUser: (email) => {
    lookupUserQuerySchema.parse({ email });
    return request('/api/admin/users/lookup', { params: { email } });
  },

  /** @param {string} userId @param {string|null} status */
  setMembershipStatus: (userId, status) => {
    setMembershipStatusSchema.parse({ status });
    return request(`/api/admin/users/${userId}/membership-status`, {
      method: 'PUT',
      body: { status },
    });
  },

  /** @returns {Promise<{status: string|null}>} the caller's own membership status */
  getMyStatus: () => request('/api/identity/me/membership-status'),

  /** @returns {Promise<{id, firstName, lastName, email}>} the caller's own basic profile */
  getMyProfile: () => request('/api/identity/me'),

  /** @returns {Promise<{enabled: boolean}>} */
  getOverduePolicy: () => request('/api/booking/settings/overdue-policy'),

  /**
   * Admin Dashboard support: club-wide JUGADOR count by membership status.
   * @returns {Promise<{ACTIVE: number, PENDING: number, OVERDUE: number, INACTIVE: number, SUSPENDED: number, NONE: number, total: number}>}
   */
  getPlayerCounts: () => request('/api/admin/users/counts'),

  /** @param {boolean} enabled */
  setOverduePolicy: (enabled) => {
    overduePolicySchema.parse({ enabled });
    return request('/api/booking/settings/overdue-policy', { method: 'PUT', body: { enabled } });
  },
};
