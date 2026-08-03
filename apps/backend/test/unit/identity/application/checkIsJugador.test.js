import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createCheckIsJugador } from '../../../../src/modules/identity/application/useCases/checkIsJugador.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';

import { createFakeUserRepository } from './fakes.js';

function buildUser(id, roleCodes = []) {
  const user = User.registerPublic({
    id,
    clubId: 'club-1',
    email: `${id}@example.com`,
    passwordHash: 'hashed:x',
    firstName: 'Test',
    lastName: 'User',
  });
  roleCodes.forEach((code) => user.roleCodes.add(code));
  return user;
}

describe('checkIsJugador', () => {
  let userRepository;
  let checkIsJugador;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    checkIsJugador = createCheckIsJugador({ userRepository });
  });

  it('returns { isJugador: true } for a user holding JUGADOR', async () => {
    await userRepository.create(buildUser('user-1', [ROLE_CODES.JUGADOR]));
    expect(await checkIsJugador({ userId: 'user-1' })).toEqual({ isJugador: true });
  });

  it('returns { isJugador: false } for a user without JUGADOR', async () => {
    await userRepository.create(buildUser('user-1'));
    expect(await checkIsJugador({ userId: 'user-1' })).toEqual({ isJugador: false });
  });

  it('returns { isJugador: false } for an unknown user id, without throwing', async () => {
    expect(await checkIsJugador({ userId: 'does-not-exist' })).toEqual({ isJugador: false });
  });
});
