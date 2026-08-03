import { beforeEach, describe, expect, it } from 'vitest';

import { createListMyGuardianships } from '../../../../src/modules/identity/application/useCases/listMyGuardianships.js';
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

describe('listMyGuardianships', () => {
  let deps;
  let listMyGuardianships;

  beforeEach(() => {
    deps = buildDeps();
    listMyGuardianships = createListMyGuardianships(deps);
  });

  it('enriches each row with the minor email', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
    await deps.guardianshipRepository.create({
      guardianUserId: 'guardian-1',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });

    const result = await listMyGuardianships({ guardianUserId: 'guardian-1' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ minorEmail: 'minor@example.com', canBook: true });
  });

  it('only returns rows for the given guardian', async () => {
    await deps.userRepository.create(buildUser('guardian-1', 'guardian1@example.com'));
    await deps.userRepository.create(buildUser('guardian-2', 'guardian2@example.com'));
    await deps.userRepository.create(buildUser('minor-1', 'minor@example.com'));
    await deps.guardianshipRepository.create({
      guardianUserId: 'guardian-2',
      minorUserId: 'minor-1',
      canPay: false,
      canBook: true,
    });

    expect(await listMyGuardianships({ guardianUserId: 'guardian-1' })).toHaveLength(0);
  });
});
