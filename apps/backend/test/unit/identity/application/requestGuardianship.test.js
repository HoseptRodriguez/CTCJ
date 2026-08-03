import { beforeEach, describe, expect, it } from 'vitest';

import { createRequestGuardianship } from '../../../../src/modules/identity/application/useCases/requestGuardianship.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';
import { GuardianshipSelfLinkForbidden } from '../../../../src/modules/identity/application/errors/GuardianshipSelfLinkForbidden.js';
import { GuardianshipAlreadyExists } from '../../../../src/modules/identity/application/errors/GuardianshipAlreadyExists.js';

import { createFakeUserRepository, createFakeGuardianshipRepository } from './fakes.js';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    guardianshipRepository: createFakeGuardianshipRepository(),
    clubId: 'club-1',
  };
}

function buildUser(id, email) {
  return User.registerPublic({
    id,
    clubId: 'club-1',
    email,
    passwordHash: 'hashed:x',
    firstName: 'Test',
    lastName: 'User',
  });
}

describe('requestGuardianship', () => {
  let deps;
  let requestGuardianship;

  beforeEach(() => {
    deps = buildDeps();
    requestGuardianship = createRequestGuardianship(deps);
  });

  it('creates a PENDING guardianship when the minor email resolves', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));

    const result = await requestGuardianship({
      guardianUserId: 'guardian-1',
      minorEmail: 'minor@example.com',
      canPay: true,
      canBook: true,
    });

    expect(result.status).toBe('PENDING');
    expect(result.guardianUserId).toBe('guardian-1');
    expect(result.minorUserId).toBe('minor-1');
    expect(result.canBook).toBe(true);
  });

  it('throws UserNotFound when the minor email does not resolve', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));

    await expect(
      requestGuardianship({
        guardianUserId: 'guardian-1',
        minorEmail: 'nadie@example.com',
        canPay: false,
        canBook: true,
      }),
    ).rejects.toThrow(UserNotFound);
  });

  it('throws GuardianshipSelfLinkForbidden when the email resolves to the requester', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));

    await expect(
      requestGuardianship({
        guardianUserId: 'guardian-1',
        minorEmail: 'guardian@example.com',
        canPay: false,
        canBook: true,
      }),
    ).rejects.toThrow(GuardianshipSelfLinkForbidden);
  });

  it('throws GuardianshipAlreadyExists when a PENDING/APPROVED pair already exists', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
    await requestGuardianship({
      guardianUserId: 'guardian-1',
      minorEmail: 'minor@example.com',
      canPay: false,
      canBook: true,
    });

    await expect(
      requestGuardianship({
        guardianUserId: 'guardian-1',
        minorEmail: 'minor@example.com',
        canPay: false,
        canBook: true,
      }),
    ).rejects.toThrow(GuardianshipAlreadyExists);
  });
});
