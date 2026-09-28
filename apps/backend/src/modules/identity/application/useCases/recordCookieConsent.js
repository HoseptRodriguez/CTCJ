import { CONSENT_ACTION, CONSENT_TYPE, COOKIES_POLICY } from '@ctcj/shared';

import { OutdatedPolicyVersion } from '../errors/OutdatedPolicyVersion.js';

/**
 * Proof of a signed-in person's cookie decision (consents table): which
 * optional categories they accepted, on which policy version, when, from
 * where. ACCEPTED when at least one optional category is on; WITHDRAWN when
 * none is (only the necessary ones). Each decision is a new row.
 *
 * @param {{ consentRepository: import('../ports/ConsentRepository.js').ConsentRepository }} deps
 */
export function createRecordCookieConsent({ consentRepository }) {
  /**
   * @param {{ userId: string, preferences: boolean, analytics: boolean, policyVersion: string,
   *   ipAddress?: string|null, userAgent?: string|null }} input
   */
  return async function recordCookieConsent({
    userId,
    preferences,
    analytics,
    policyVersion,
    ipAddress = null,
    userAgent = null,
  }) {
    if (policyVersion !== COOKIES_POLICY.version) {
      throw new OutdatedPolicyVersion();
    }
    const row = await consentRepository.append({
      userId,
      consentType: CONSENT_TYPE.COOKIES,
      documentVersion: policyVersion,
      action: preferences || analytics ? CONSENT_ACTION.ACCEPTED : CONSENT_ACTION.WITHDRAWN,
      details: { necessary: true, preferences, analytics },
      ipAddress,
      userAgent,
    });
    return { recordedAt: row.createdAt, action: row.action };
  };
}
