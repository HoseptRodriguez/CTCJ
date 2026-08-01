import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createGrantRoleToUser } from '../../../../src/modules/identity/application/useCases/grantRoleToUser.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { SelfAssignmentForbidden } from '../../../../src/modules/identity/domain/errors/SelfAssignmentForbidden.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

import { createFakeUserRepository, createFakeRoleRepository } from './fakes.js';

function buildDeps() {
  return {
    userRepository: createFakeUserRepository(),
    roleRepository: createFakeRoleRepository(),
  };
}

async function seedUser(userRepository) {
  const user = User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'jugador@example.com',
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  await userRepository.create(user);
  return user;
}

describe('grantRoleToUser', () => {
  let deps;
  let grantRoleToUser;

  beforeEach(() => {
    deps = buildDeps();
    grantRoleToUser = createGrantRoleToUser(deps);
  });

  it('grants a professional role when the grantor is an admin', async () => {
    await seedUser(deps.userRepository);

    await grantRoleToUser({
      targetUserId: 'user-1',
      roleCode: ROLE_CODES.ENTRENADOR,
      grantedByUserId: 'admin-1',
      grantorIsAdmin: true,
    });

    const user = await deps.userRepository.findById('user-1');
    expect(user.hasRole(ROLE_CODES.ENTRENADOR)).toBe(true);
    expect(deps.userRepository.roleGrants).toContainEqual({
      userId: 'user-1',
      roleCode: ROLE_CODES.ENTRENADOR,
      grantedByUserId: 'admin-1',
    });
  });

  it('rejects the grant, and records no grant, when the grantor is not an admin', async () => {
    await seedUser(deps.userRepository);

    await expect(
      grantRoleToUser({
        targetUserId: 'user-1',
        roleCode: ROLE_CODES.ADMINISTRADOR,
        grantedByUserId: 'user-1',
        grantorIsAdmin: false,
      }),
    ).rejects.toThrow(SelfAssignmentForbidden);

    const user = await deps.userRepository.findById('user-1');
    expect(user.hasRole(ROLE_CODES.ADMINISTRADOR)).toBe(false);
    expect(deps.userRepository.roleGrants ?? []).toHaveLength(0);
  });

  it('throws UserNotFound for a nonexistent target user', async () => {
    await expect(
      grantRoleToUser({
        targetUserId: 'does-not-exist',
        roleCode: ROLE_CODES.ENTRENADOR,
        grantedByUserId: 'admin-1',
        grantorIsAdmin: true,
      }),
    ).rejects.toThrow(UserNotFound);
  });
});
