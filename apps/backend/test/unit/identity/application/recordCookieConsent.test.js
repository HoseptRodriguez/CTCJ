import { describe, expect, it } from 'vitest';
import { COOKIES_POLICY } from '@ctcj/shared';

import { createRecordCookieConsent } from '../../../../src/modules/identity/application/useCases/recordCookieConsent.js';
import { OutdatedPolicyVersion } from '../../../../src/modules/identity/application/errors/OutdatedPolicyVersion.js';

import { createFakeConsentRepository } from './fakes.js';

describe('recordCookieConsent (proof for signed-in people)', () => {
  it('each decision is a new row: accepting preferences, then only necessary', async () => {
    const consentRepository = createFakeConsentRepository();
    const record = createRecordCookieConsent({ consentRepository });
    const base = { userId: 'u1', analytics: false, policyVersion: COOKIES_POLICY.version };

    await record({ ...base, preferences: true, ipAddress: '10.0.0.1', userAgent: 'Nav' });
    await record({ ...base, preferences: false });

    expect(
      consentRepository.rows.map((r) => [r.consentType, r.action, r.details.preferences]),
    ).toEqual([
      ['COOKIES', 'ACCEPTED', true],
      ['COOKIES', 'WITHDRAWN', false],
    ]);
    expect(consentRepository.rows[0]).toMatchObject({
      documentVersion: COOKIES_POLICY.version,
      ipAddress: '10.0.0.1',
      userAgent: 'Nav',
    });
  });

  it('a decision on an old policy version is refused (the banner asks again)', async () => {
    const record = createRecordCookieConsent({ consentRepository: createFakeConsentRepository() });
    await expect(
      record({ userId: 'u1', preferences: true, analytics: false, policyVersion: '0' }),
    ).rejects.toThrow(OutdatedPolicyVersion);
  });
});
