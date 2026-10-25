import { describe, expect, it } from 'vitest';

import { createOptionalAuthorizationUseCases } from '../../../../src/modules/identity/application/useCases/optionalAuthorizations.js';
import { MarketingChannelRequired } from '../../../../src/modules/identity/application/errors/MarketingChannelRequired.js';
import { MinorNeedsGuardian } from '../../../../src/modules/identity/application/errors/MinorNeedsGuardian.js';
import { UnknownAuthorization } from '../../../../src/modules/identity/application/errors/UnknownAuthorization.js';
import { GuardianshipNotFound } from '../../../../src/modules/identity/application/errors/GuardianshipNotFound.js';

import { createFakeConsentRepository } from './fakes.js';

function setup({ minors = [], guardianships = [] } = {}) {
  const consentRepository = createFakeConsentRepository();
  const guardianshipRepository = {
    async findById(id) {
      return guardianships.find((g) => g.id === id) ?? null;
    },
    async findActiveForPair(guardianUserId, minorUserId) {
      return (
        guardianships.find(
          (g) => g.guardianUserId === guardianUserId && g.minorUserId === minorUserId,
        ) ?? null
      );
    },
  };
  const checkIsMinor = async ({ userId }) => ({ isMinor: minors.includes(userId) });
  return {
    consentRepository,
    guardianships,
    ...createOptionalAuthorizationUseCases({
      consentRepository,
      guardianshipRepository,
      checkIsMinor,
    }),
  };
}

describe('optional authorizations', () => {
  it('lists the three optional authorizations, none accepted by default', async () => {
    const { getMyAuthorizations } = setup();
    const result = await getMyAuthorizations({ userId: 'u1' });
    expect(result.items.map((i) => [i.type, i.accepted])).toEqual([
      ['MARKETING', false],
      ['HEALTH_DATA', false],
      ['COMMUNITY_RULES', false],
    ]);
    expect(result.cookies.decidedAt).toBeNull();
  });

  it('accept then withdraw: two rows, never an update, and the proof keeps where from', async () => {
    const { setMyAuthorization, hasAuthorizationInForce, consentRepository } = setup();
    const accepted = await setMyAuthorization({
      userId: 'u1',
      type: 'HEALTH_DATA',
      accept: true,
      ipAddress: '10.0.0.1',
      userAgent: 'Prueba',
    });
    expect(accepted).toMatchObject({ accepted: true, acceptedVersion: '1' });
    expect(await hasAuthorizationInForce({ userId: 'u1', type: 'HEALTH_DATA' })).toBe(true);

    const withdrawn = await setMyAuthorization({
      userId: 'u1',
      type: 'HEALTH_DATA',
      accept: false,
    });
    expect(withdrawn.accepted).toBe(false);
    expect(await hasAuthorizationInForce({ userId: 'u1', type: 'HEALTH_DATA' })).toBe(false);
    expect(consentRepository.rows.map((r) => r.action)).toEqual(['ACCEPTED', 'WITHDRAWN']);
    expect(consentRepository.rows[0]).toMatchObject({ ipAddress: '10.0.0.1', userAgent: 'Prueba' });
  });

  it('promotions need at least one channel, and keep the channels chosen', async () => {
    const { setMyAuthorization } = setup();
    await expect(
      setMyAuthorization({ userId: 'u1', type: 'MARKETING', accept: true, channels: [] }),
    ).rejects.toBeInstanceOf(MarketingChannelRequired);
    const r = await setMyAuthorization({
      userId: 'u1',
      type: 'MARKETING',
      accept: true,
      channels: ['whatsapp', 'whatsapp'],
    });
    expect(r.channels).toEqual(['whatsapp']);
  });

  it('the Community rules keep the declaration about people who appear in photos', async () => {
    const { setMyAuthorization, consentRepository } = setup();
    await setMyAuthorization({ userId: 'u1', type: 'COMMUNITY_RULES', accept: true });
    expect(consentRepository.rows[0].details).toEqual({ declaresPermissionOfPeopleShown: true });
  });

  it('rejects anything that is not an optional authorization (e.g. the privacy policy)', async () => {
    const { setMyAuthorization } = setup();
    await expect(
      setMyAuthorization({ userId: 'u1', type: 'PRIVACY_POLICY', accept: false }),
    ).rejects.toBeInstanceOf(UnknownAuthorization);
  });

  it('a minor cannot accept health data or promotions, but can withdraw', async () => {
    const { setMyAuthorization } = setup({ minors: ['kid'] });
    await expect(
      setMyAuthorization({ userId: 'kid', type: 'HEALTH_DATA', accept: true }),
    ).rejects.toBeInstanceOf(MinorNeedsGuardian);
    await expect(
      setMyAuthorization({ userId: 'kid', type: 'MARKETING', accept: true, channels: ['email'] }),
    ).rejects.toBeInstanceOf(MinorNeedsGuardian);
    await expect(
      setMyAuthorization({ userId: 'kid', type: 'HEALTH_DATA', accept: false }),
    ).resolves.toMatchObject({ accepted: false });
  });

  it("the guardian gives the minor's health authorization; it lapses if the link does", async () => {
    const guardianships = [
      { id: 'g1', guardianUserId: 'mom', minorUserId: 'kid', status: 'APPROVED' },
    ];
    const {
      setMinorHealthAuthorization,
      hasAuthorizationInForce,
      minorHealthAuthorizationFor,
      getMyAuthorizations,
    } = setup({ minors: ['kid'], guardianships });

    await expect(
      setMinorHealthAuthorization({ guardianUserId: 'other', guardianshipId: 'g1', accept: true }),
    ).rejects.toBeInstanceOf(GuardianshipNotFound);

    await setMinorHealthAuthorization({
      guardianUserId: 'mom',
      guardianshipId: 'g1',
      accept: true,
    });
    expect(await hasAuthorizationInForce({ userId: 'kid', type: 'HEALTH_DATA' })).toBe(true);
    expect(
      await minorHealthAuthorizationFor({ guardianUserId: 'mom', minorUserId: 'kid' }),
    ).toMatchObject({ authorized: true });
    const mine = await getMyAuthorizations({ userId: 'kid' });
    expect(mine.items.find((i) => i.type === 'HEALTH_DATA')).toMatchObject({
      accepted: true,
      givenByGuardian: true,
    });

    guardianships[0].status = 'REVOKED';
    expect(await hasAuthorizationInForce({ userId: 'kid', type: 'HEALTH_DATA' })).toBe(false);
  });
});
