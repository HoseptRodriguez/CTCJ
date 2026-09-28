import { describe, expect, it } from 'vitest';
import { PRIVACY_POLICY, registerSchema, TERMS } from '@ctcj/shared';

import { createRegisterUser } from '../../../../src/modules/identity/application/useCases/registerUser.js';
import { createAccountRequirementsUseCases } from '../../../../src/modules/identity/application/useCases/accountRequirements.js';

import {
  createFakeClock,
  createFakeConsentRepository,
  createFakeEmailSender,
  createFakeEmailVerificationRepository,
  createFakePasswordHasher,
  createFakeTokenService,
  createFakeUserRepository,
} from './fakes.js';

function setup() {
  const deps = {
    userRepository: createFakeUserRepository(),
    emailVerificationRepository: createFakeEmailVerificationRepository(),
    passwordHasher: createFakePasswordHasher(),
    tokenService: createFakeTokenService(),
    emailSender: createFakeEmailSender(),
    consentRepository: createFakeConsentRepository(),
    clock: createFakeClock(new Date('2026-09-28T15:00:00Z')),
    clubId: 'club-1',
    appPublicUrl: 'http://localhost:5173',
  };
  return { deps, register: createRegisterUser(deps) };
}
const base = {
  email: 'ana@correo.com',
  password: 'ClaveSegura123',
  firstName: 'Ana',
  lastName: 'Gómez',
  acceptPrivacy: true,
  acceptTerms: true,
};

describe('sign-up: birth date and authorizations', () => {
  it('the form requires the birth date and both boxes ticked; promotions are optional', () => {
    const ok = { ...base, birthDate: '1990-05-02' };
    expect(registerSchema.safeParse(ok).success).toBe(true);
    expect(registerSchema.parse(ok).marketing).toEqual({ email: false, whatsapp: false });
    for (const bad of [
      { ...ok, birthDate: undefined },
      { ...ok, birthDate: '2999-01-01' },
      { ...ok, acceptPrivacy: false },
      { ...ok, acceptTerms: undefined },
    ]) {
      expect(registerSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('stores the birth date and the proof of each authorization, with version, IP and browser', async () => {
    const { deps, register } = setup();
    const { userId } = await register({
      ...base,
      birthDate: '1990-05-02',
      marketing: { email: false, whatsapp: true },
      ipAddress: '10.0.0.1',
      userAgent: 'Nav',
    });
    expect((await deps.userRepository.findById(userId)).birthDate).toEqual(
      new Date('1990-05-02T00:00:00Z'),
    );
    expect(
      deps.consentRepository.rows.map((r) => [r.consentType, r.documentVersion, r.details]),
    ).toEqual([
      ['PRIVACY_POLICY', PRIVACY_POLICY.version, null],
      ['TERMS', TERMS.version, null],
      ['MARKETING', '1', { channels: ['whatsapp'] }],
    ]);
    expect(deps.consentRepository.rows.every((r) => r.ipAddress === '10.0.0.1')).toBe(true);
  });

  it('no promotions without choosing a channel, and never for a minor', async () => {
    const adult = setup();
    await adult.register({ ...base, birthDate: '1990-05-02' });
    expect(adult.deps.consentRepository.rows.map((r) => r.consentType)).not.toContain('MARKETING');

    const minor = setup();
    await minor.register({
      ...base,
      birthDate: '2012-03-01',
      marketing: { email: true, whatsapp: true },
    });
    expect(minor.deps.consentRepository.rows.map((r) => r.consentType)).toEqual([
      'PRIVACY_POLICY',
      'TERMS',
    ]);
  });
});

describe('existing accounts complete what is missing at their next sign-in', () => {
  it('asks for the birth date and the acceptances, and stops asking once given', async () => {
    const { deps } = setup();
    const user = await deps.userRepository.create(
      (
        await import('../../../../src/modules/identity/domain/entities/User.js')
      ).User.registerPublic({
        id: 'viejo',
        clubId: 'club-1',
        email: 'viejo@correo.com',
        passwordHash: 'h',
        firstName: 'Luis',
        lastName: 'Rey',
      }),
    );
    const uc = createAccountRequirementsUseCases(deps);
    expect(await uc.getAccountRequirements({ userId: user.id })).toMatchObject({
      birthDateMissing: true,
      privacyPending: true,
      termsPending: true,
    });
    const after = await uc.completeAccount({
      userId: user.id,
      birthDate: '1985-01-10',
      acceptPrivacy: true,
      acceptTerms: true,
      ipAddress: '10.0.0.2',
    });
    expect(after).toMatchObject({
      birthDateMissing: false,
      privacyPending: false,
      termsPending: false,
    });
    expect(deps.consentRepository.rows.map((r) => r.consentType)).toEqual([
      'PRIVACY_POLICY',
      'TERMS',
    ]);

    // Once set, the birth date isn't overwritten from here (it's edited in "Mi perfil").
    await uc.completeAccount({ userId: user.id, birthDate: '2000-01-01' });
    expect((await deps.userRepository.findById(user.id)).birthDate).toEqual(
      new Date('1985-01-10T00:00:00Z'),
    );
  });
});
