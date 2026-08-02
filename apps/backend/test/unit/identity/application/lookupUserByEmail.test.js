import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createLookupUserByEmail } from '../../../../src/modules/identity/application/useCases/lookupUserByEmail.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

import { createFakeUserRepository } from './fakes.js';

describe('lookupUserByEmail', () => {
  let userRepository;
  let lookupUserByEmail;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    lookupUserByEmail = createLookupUserByEmail({ userRepository, clubId: 'club-1' });
  });

  it('returns the user summary including roles and membership status', async () => {
    const user = User.registerPublic({
      id: 'user-1',
      clubId: 'club-1',
      email: 'jugador@example.com',
      passwordHash: 'x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    user.roleCodes.add(ROLE_CODES.JUGADOR);
    await userRepository.create(user);

    const result = await lookupUserByEmail({ email: 'jugador@example.com' });

    expect(result).toEqual({
      id: 'user-1',
      email: 'jugador@example.com',
      firstName: 'Ana',
      lastName: 'Gomez',
      roleCodes: [ROLE_CODES.USUARIO, ROLE_CODES.JUGADOR],
      membershipStatus: null,
    });
  });

  it('throws UserNotFound for an unregistered email', async () => {
    await expect(lookupUserByEmail({ email: 'nobody@example.com' })).rejects.toThrow(UserNotFound);
  });
});
