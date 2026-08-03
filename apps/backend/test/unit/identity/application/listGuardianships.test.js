import { beforeEach, describe, expect, it } from 'vitest';

import { createListGuardianships } from '../../../../src/modules/identity/application/useCases/listGuardianships.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository, createFakeGuardianshipRepository } from './fakes.js';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    guardianshipRepository: createFakeGuardianshipRepository(),
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

describe('listGuardianships', () => {
  let deps;
  let listGuardianships;

  beforeEach(() => {
    deps = buildDeps();
    listGuardianships = createListGuardianships(deps);
  });

  it('defaults to PENDING and enriches each row with guardian/minor email', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
    await deps.guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });

    const result = await listGuardianships();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: 'PENDING',
      guardianEmail: 'guardian@example.com',
      minorEmail: 'minor@example.com',
    });
  });

  it('respects an explicit status filter', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
    const g = await deps.guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });
    await deps.guardianshipRepository.decide(g.id, 'APPROVED', new Date(), 'admin-1', null);

    expect(await listGuardianships({ status: 'PENDING' })).toHaveLength(0);
    expect(await listGuardianships({ status: 'APPROVED' })).toHaveLength(1);
  });
});
