import {
  setMembershipStatusSchema,
  lookupUserQuerySchema,
  overduePolicySchema,
} from '@ctcj/shared';

import { request, requestMultipart } from './httpClient.js';

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

  /** @returns {Promise<{id, firstName, lastName, email, phone, birthDate, bio, avatarUrl}>} the caller's own full profile */
  getMyProfile: () => request('/api/identity/me'),

  /**
   * @param {{phone?: string|null, birthDate?: string|null, bio?: string|null}} payload
   * birthDate must already be a plain YYYY-MM-DD string (e.g. straight from
   * an `<input type="date">`) -- not pre-parsed with updateMyProfileSchema
   * client-side, since that schema transforms it into a Date object that
   * would round-trip through JSON.stringify as a full ISO datetime, which
   * the backend's z.string().date() rejects.
   */
  updateMyProfile: (payload) => request('/api/identity/me', { method: 'PATCH', body: payload }),

  /** @param {File} file @returns {Promise<{avatarUrl: string}>} */
  uploadMyAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return requestMultipart('/api/identity/me/avatar', { formData });
  },

  /** @returns {Promise<{badges: {code: string, label: string, earned: boolean}[]}>} */
  getMyAchievements: () => request('/api/identity/me/achievements'),

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
