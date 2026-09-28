import { beforeEach, describe, expect, it } from 'vitest';

import { createMinorAuthorizationUseCases } from '../../../../src/modules/identity/application/useCases/minorAuthorization.js';
import { createListMyGuardianships } from '../../../../src/modules/identity/application/useCases/listMyGuardianships.js';
import { GuardianshipNotApproved } from '../../../../src/modules/identity/application/errors/GuardianshipNotApproved.js';
import { GuardianshipNotFound } from '../../../../src/modules/identity/application/errors/GuardianshipNotFound.js';

import { createFakeConsentRepository, createFakeGuardianshipRepository } from './fakes.js';

// "hijo" is a minor by birth date; "adulto" is not.
const MINORS = new Set(['hijo']);

describe("a minor's account waits for the guardian's authorization", () => {
  let consentRepository;
  let guardianshipRepository;
  let uc;

  beforeEach(() => {
    consentRepository = createFakeConsentRepository();
    guardianshipRepository = createFakeGuardianshipRepository();
    uc = createMinorAuthorizationUseCases({
      consentRepository,
      guardianshipRepository,
      checkIsMinor: async ({ userId }) => ({
        isMinor: MINORS.has(userId) || (await guardianshipRepository.existsApprovedAsMinor(userId)),
      }),
    });
  });

  async function approvedLink(guardian = 'mama', minor = 'hijo') {
    const g = await guardianshipRepository.create({
      guardianUserId: guardian,
      minorUserId: minor,
      canPay: true,
      canBook: true,
    });
    await guardianshipRepository.decide(g.id, 'APPROVED', new Date(), 'admin', null);
    return g;
  }

  it('an adult is never pending', async () => {
    expect(await uc.getAccountRestrictions({ userId: 'adulto' })).toEqual({
      isMinor: false,
      pendingGuardianAuthorization: false,
    });
  });

  it('a registered minor is pending; linking alone is not enough; the authorization frees the account', async () => {
    expect(await uc.isPendingGuardianAuthorization({ userId: 'hijo' })).toBe(true);
    const link = await approvedLink();
    expect(await uc.isPendingGuardianAuthorization({ userId: 'hijo' })).toBe(true);

    const result = await uc.authorizeMinor({
      guardianUserId: 'mama',
      guardianshipId: link.id,
      ipAddress: '10.0.0.1',
      userAgent: 'Navegador',
    });
    expect(result).toMatchObject({ authorized: true, version: '1' });
    expect(await uc.getAccountRestrictions({ userId: 'hijo' })).toEqual({
      isMinor: true,
      pendingGuardianAuthorization: false,
    });
    // The proof: about the minor, given by the guardian, with version, IP and browser.
    expect(consentRepository.rows[0]).toMatchObject({
      userId: 'hijo',
      givenBy: 'mama',
      consentType: 'MINOR_DATA_IMAGE',
      documentVersion: '1',
      action: 'ACCEPTED',
      ipAddress: '10.0.0.1',
      userAgent: 'Navegador',
    });
  });

  it('withdrawing adds a row (nothing is erased) and the account is pending again', async () => {
    const link = await approvedLink();
    await uc.authorizeMinor({ guardianUserId: 'mama', guardianshipId: link.id });
    await uc.withdrawMinorAuthorization({ guardianUserId: 'mama', guardianshipId: link.id });

    expect(consentRepository.rows.map((r) => r.action)).toEqual(['ACCEPTED', 'WITHDRAWN']);
    expect(await uc.isPendingGuardianAuthorization({ userId: 'hijo' })).toBe(true);
  });

  it('an authorization stops counting if that guardianship is no longer approved', async () => {
    const link = await approvedLink();
    await uc.authorizeMinor({ guardianUserId: 'mama', guardianshipId: link.id });
    await guardianshipRepository.decide(link.id, 'REVOKED', new Date(), 'admin', null);
    expect(await uc.isPendingGuardianAuthorization({ userId: 'hijo' })).toBe(true);
  });

  it('only the guardian of that approved guardianship can authorize', async () => {
    const link = await approvedLink();
    await expect(
      uc.authorizeMinor({ guardianUserId: 'otra-persona', guardianshipId: link.id }),
    ).rejects.toThrow(GuardianshipNotFound);

    const pending = await guardianshipRepository.create({
      guardianUserId: 'papa',
      minorUserId: 'hijo',
      canPay: false,
      canBook: false,
    });
    await expect(
      uc.authorizeMinor({ guardianUserId: 'papa', guardianshipId: pending.id }),
    ).rejects.toThrow(GuardianshipNotApproved);
  });

  it("the guardian's list says whether the authorization is in force", async () => {
    const link = await approvedLink();
    const list = createListMyGuardianships({
      guardianshipRepository,
      userRepository: { findById: async () => ({ email: 'hijo@correo.com' }) },
      minorAuthorizationFor: uc.minorAuthorizationFor,
    });
    expect((await list({ guardianUserId: 'mama' }))[0].minorAuthorization.authorized).toBe(false);
    await uc.authorizeMinor({ guardianUserId: 'mama', guardianshipId: link.id });
    expect((await list({ guardianUserId: 'mama' }))[0].minorAuthorization).toMatchObject({
      authorized: true,
      version: '1',
    });
  });
});
