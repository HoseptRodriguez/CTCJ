import { recordCookieConsentSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const consentClient = {
  /** @returns {Promise<{birthDateMissing: boolean, privacyPending: boolean, termsPending: boolean}>} */
  getAccountRequirements: () => request('/api/identity/me/account-requirements'),

  /** @param {{ birthDate?: string, acceptPrivacy?: true, acceptTerms?: true }} payload */
  completeAccount: (payload) =>
    request('/api/identity/me/complete-account', { method: 'POST', body: payload }),

  /**
   * Proof of the cookie decision of a signed-in person.
   * @param {{ preferences: boolean, analytics: boolean, policyVersion: string }} payload
   */
  recordCookieConsent: (payload) => {
    recordCookieConsentSchema.parse(payload);
    return request('/api/identity/me/consents/cookies', { method: 'POST', body: payload });
  },

  /** Optional authorizations: promotions, health data, Community rules (+ cookies, read-only). */
  getMyAuthorizations: () => request('/api/identity/me/authorizations'),

  /**
   * @param {'MARKETING'|'HEALTH_DATA'|'COMMUNITY_RULES'} type
   * @param {{ accept: boolean, channels?: ('email'|'whatsapp')[] }} payload
   */
  setMyAuthorization: (type, payload) =>
    request(`/api/identity/me/authorizations/${type}`, { method: 'PUT', body: payload }),

  /** The guardian accepts or withdraws the health-data authorization for a linked minor. */
  setMinorPublicName: (guardianshipId, accept) =>
    request(`/api/identity/me/guardianships/${guardianshipId}/public-name-authorization`, {
      method: 'PUT',
      body: { accept },
    }),
  setMinorHealthAuthorization: (guardianshipId, accept) =>
    request(`/api/identity/me/guardianships/${guardianshipId}/health-authorization`, {
      method: 'PUT',
      body: { accept },
    }),
};
