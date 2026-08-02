import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES, MEMBERSHIP_STATUS } from '@ctcj/shared';

import { createSetMembershipStatus } from '../../../../src/modules/identity/application/useCases/setMembershipStatus.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { MembershipNotApplicable } from '../../../../src/modules/identity/domain/errors/MembershipNotApplicable.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

import { createFakeUserRepository, createFakeClock } from './fakes.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    clock: createFakeClock(NOW),
  };
}

async function seedJugador(userRepository) {
  const user = User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'jugador@example.com',
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  user.roleCodes.add(ROLE_CODES.JUGADOR);
  await userRepository.create(user);
  return user;
}

describe('setMembershipStatus', () => {
  let deps;
  let setMembershipStatus;

  beforeEach(() => {
    deps = buildDeps();
    setMembershipStatus = createSetMembershipStatus(deps);
  });

  it('sets the status for a JUGADOR and returns the result', async () => {
    await seedJugador(deps.userRepository);

    const result = await setMembershipStatus({
      targetUserId: 'user-1',
      status: MEMBERSHIP_STATUS.OVERDUE,
      updatedByUserId: 'admin-1',
    });

    expect(result).toEqual({ userId: 'user-1', membershipStatus: MEMBERSHIP_STATUS.OVERDUE });
    const stored = await deps.userRepository.findById('user-1');
    expect(stored.membershipStatus).toBe(MEMBERSHIP_STATUS.OVERDUE);
    expect(stored.membershipStatusUpdatedBy).toBe('admin-1');
  });

  it('rejects setting a status on a non-JUGADOR user', async () => {
    const user = User.registerPublic({
      id: 'user-2',
      clubId: 'club-1',
      email: 'usuario@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Bob',
      lastName: 'Ruiz',
    });
    await deps.userRepository.create(user);

    await expect(
      setMembershipStatus({
        targetUserId: 'user-2',
        status: MEMBERSHIP_STATUS.ACTIVE,
        updatedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(MembershipNotApplicable);
  });

  it('throws UserNotFound for a nonexistent target', async () => {
    await expect(
      setMembershipStatus({
        targetUserId: 'does-not-exist',
        status: MEMBERSHIP_STATUS.ACTIVE,
        updatedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(UserNotFound);
  });
});
