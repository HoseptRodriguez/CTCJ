import { recordCookieConsentSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const consentClient = {
  /**
   * Proof of the cookie decision of a signed-in person.
   * @param {{ preferences: boolean, analytics: boolean, policyVersion: string }} payload
   */
  recordCookieConsent: (payload) => {
    recordCookieConsentSchema.parse(payload);
    return request('/api/identity/me/consents/cookies', { method: 'POST', body: payload });
  },
};
