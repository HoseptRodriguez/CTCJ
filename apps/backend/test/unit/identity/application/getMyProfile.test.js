import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyProfile } from '../../../../src/modules/identity/application/useCases/getMyProfile.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository } from './fakes.js';

describe('getMyProfile', () => {
  let userRepository;
  let getMyProfile;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    getMyProfile = createGetMyProfile({ userRepository });
  });

  it("returns the caller's own basic profile", async () => {
    await userRepository.create(
      new User({
        id: 'user-1',
        clubId: 'club-1',
        email: 'ana@example.com',
        passwordHash: 'hash',
        firstName: 'Ana',
        lastName: 'Gomez',
      }),
    );

    const profile = await getMyProfile({ userId: 'user-1' });
    expect(profile).toEqual({
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@example.com',
    });
  });

  it('throws UserNotFound for an unknown id', async () => {
    await expect(getMyProfile({ userId: 'nonexistent' })).rejects.toThrow(UserNotFound);
  });
});
