import { beforeEach, describe, expect, it } from 'vitest';

import { createGetPlayerCounts } from '../../../../src/modules/identity/application/useCases/getPlayerCounts.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository } from './fakes.js';

describe('getPlayerCounts', () => {
  let userRepository;
  let getPlayerCounts;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    getPlayerCounts = createGetPlayerCounts({ userRepository, clubId: 'club-1' });
  });

  it('counts JUGADORs by membership status, including players with no status set', async () => {
    await userRepository.create(
      new User({
        id: 'p1',
        clubId: 'club-1',
        email: 'p1@example.com',
        passwordHash: 'h',
        firstName: 'A',
        lastName: 'B',
        roleCodes: ['USUARIO', 'JUGADOR'],
        membershipStatus: 'ACTIVE',
      }),
    );
    await userRepository.create(
      new User({
        id: 'p2',
        clubId: 'club-1',
        email: 'p2@example.com',
        passwordHash: 'h',
        firstName: 'C',
        lastName: 'D',
        roleCodes: ['USUARIO', 'JUGADOR'],
        membershipStatus: 'ACTIVE',
      }),
    );
    await userRepository.create(
      new User({
        id: 'p3',
        clubId: 'club-1',
        email: 'p3@example.com',
        passwordHash: 'h',
        firstName: 'E',
        lastName: 'F',
        roleCodes: ['USUARIO', 'JUGADOR'],
        membershipStatus: null,
      }),
    );
    // Not a JUGADOR -- must not be counted.
    await userRepository.create(
      new User({
        id: 'staff-1',
        clubId: 'club-1',
        email: 'staff@example.com',
        passwordHash: 'h',
        firstName: 'G',
        lastName: 'H',
        roleCodes: ['USUARIO', 'ADMINISTRADOR'],
        membershipStatus: 'ACTIVE',
      }),
    );

    const counts = await getPlayerCounts();
    expect(counts).toEqual({
      ACTIVE: 2,
      PENDING: 0,
      OVERDUE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
      NONE: 1,
      total: 3,
    });
  });
});
