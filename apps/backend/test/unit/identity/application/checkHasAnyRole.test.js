import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createCheckHasAnyRole } from '../../../../src/modules/identity/application/useCases/checkHasAnyRole.js';
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

describe('checkHasAnyRole', () => {
  let userRepository;
  let checkHasAnyRole;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    checkHasAnyRole = createCheckHasAnyRole({ userRepository });
  });

  it('returns { hasAnyRole: true } when the user holds one of the listed roles', async () => {
    await userRepository.create(buildUser('user-1', [ROLE_CODES.PSICOLOGO]));
    expect(
      await checkHasAnyRole({
        userId: 'user-1',
        roleCodes: [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO],
      }),
    ).toEqual({ hasAnyRole: true });
  });

  it('returns { hasAnyRole: true } when the user holds the second listed role', async () => {
    await userRepository.create(buildUser('user-1', [ROLE_CODES.NEUROPSICOLOGO]));
    expect(
      await checkHasAnyRole({
        userId: 'user-1',
        roleCodes: [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO],
      }),
    ).toEqual({ hasAnyRole: true });
  });

  it('returns { hasAnyRole: false } when the user holds none of the listed roles', async () => {
    await userRepository.create(buildUser('user-1', [ROLE_CODES.JUGADOR]));
    expect(
      await checkHasAnyRole({
        userId: 'user-1',
        roleCodes: [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO],
      }),
    ).toEqual({ hasAnyRole: false });
  });

  it('returns { hasAnyRole: false } for an unknown user id, without throwing', async () => {
    expect(
      await checkHasAnyRole({ userId: 'does-not-exist', roleCodes: [ROLE_CODES.PSICOLOGO] }),
    ).toEqual({ hasAnyRole: false });
  });
});
