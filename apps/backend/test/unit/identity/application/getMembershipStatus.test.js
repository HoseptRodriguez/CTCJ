import { beforeEach, describe, expect, it } from 'vitest';
import { MEMBERSHIP_STATUS } from '@ctcj/shared';

import { createGetMembershipStatus } from '../../../../src/modules/identity/application/useCases/getMembershipStatus.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

import { createFakeUserRepository } from './fakes.js';

describe('getMembershipStatus', () => {
  let userRepository;
  let getMembershipStatus;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    getMembershipStatus = createGetMembershipStatus({ userRepository });
  });

  it('returns null for a user with no membership status', async () => {
    const user = User.registerPublic({
      id: 'user-1',
      clubId: 'club-1',
      email: 'a@example.com',
      passwordHash: 'x',
      firstName: 'A',
      lastName: 'B',
    });
    await userRepository.create(user);

    expect(await getMembershipStatus({ userId: 'user-1' })).toEqual({ status: null });
  });

  it('returns the current status', async () => {
    const user = User.registerPublic({
      id: 'user-1',
      clubId: 'club-1',
      email: 'a@example.com',
      passwordHash: 'x',
      firstName: 'A',
      lastName: 'B',
    });
    user.membershipStatus = MEMBERSHIP_STATUS.ACTIVE;
    await userRepository.create(user);

    expect(await getMembershipStatus({ userId: 'user-1' })).toEqual({
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
  });

  it('throws UserNotFound for a nonexistent user', async () => {
    await expect(getMembershipStatus({ userId: 'does-not-exist' })).rejects.toThrow(UserNotFound);
  });
});
