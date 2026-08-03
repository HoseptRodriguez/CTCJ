import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createDecideGuardianship } from '../../../../src/modules/identity/application/useCases/decideGuardianship.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { GuardianshipNotFound } from '../../../../src/modules/identity/application/errors/GuardianshipNotFound.js';
import { GuardianshipNotPending } from '../../../../src/modules/identity/application/errors/GuardianshipNotPending.js';

import {
  createFakeUserRepository,
  createFakeGuardianshipRepository,
  createFakeClock,
} from './fakes.js';

const NOW = new Date('2026-08-02T10:00:00Z');

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    guardianshipRepository: createFakeGuardianshipRepository(),
    clock: createFakeClock(NOW),
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

async function seedGuardianship(deps) {
  await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
  await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
  return deps.guardianshipRepository.create({
    guardianUserId: 'guardian-1',
    minorUserId: 'minor-1',
    canPay: false,
    canBook: true,
  });
}

describe('decideGuardianship', () => {
  let deps;
  let decideGuardianship;

  beforeEach(() => {
    deps = buildDeps();
    decideGuardianship = createDecideGuardianship(deps);
  });

  it('approve grants PADRE_TUTOR to the guardian and marks APPROVED', async () => {
    const guardianship = await seedGuardianship(deps);

    const result = await decideGuardianship({
      guardianshipId: guardianship.id,
      decision: 'APPROVED',
      decidedByUserId: 'admin-1',
    });

    expect(result.status).toBe('APPROVED');
    const guardian = await deps.userRepository.findById('guardian-1');
    expect(guardian.hasRole(ROLE_CODES.PADRE_TUTOR)).toBe(true);
  });

  it('reject marks REJECTED and does not touch roles', async () => {
    const guardianship = await seedGuardianship(deps);

    const result = await decideGuardianship({
      guardianshipId: guardianship.id,
      decision: 'REJECTED',
      decidedByUserId: 'admin-1',
    });

    expect(result.status).toBe('REJECTED');
    const guardian = await deps.userRepository.findById('guardian-1');
    expect(guardian.hasRole(ROLE_CODES.PADRE_TUTOR)).toBe(false);
  });

  it('throws GuardianshipNotFound for an unknown id', async () => {
    await expect(
      decideGuardianship({
        guardianshipId: 'does-not-exist',
        decision: 'APPROVED',
        decidedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(GuardianshipNotFound);
  });

  it('throws GuardianshipNotPending if already decided', async () => {
    const guardianship = await seedGuardianship(deps);
    await decideGuardianship({
      guardianshipId: guardianship.id,
      decision: 'APPROVED',
      decidedByUserId: 'admin-1',
    });

    await expect(
      decideGuardianship({
        guardianshipId: guardianship.id,
        decision: 'REJECTED',
        decidedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(GuardianshipNotPending);
  });
});
