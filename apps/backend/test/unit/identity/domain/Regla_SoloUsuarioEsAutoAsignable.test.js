import { describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { SelfAssignmentForbidden } from '../../../../src/modules/identity/domain/errors/SelfAssignmentForbidden.js';
import { grantRole } from '../../../../src/modules/identity/domain/services/grantRole.js';

function buildUser() {
  return User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'Jugador@Example.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
}

const NON_SELF_ASSIGNABLE_ROLES = [
  ROLE_CODES.JUGADOR,
  ROLE_CODES.PADRE_TUTOR,
  ROLE_CODES.ENTRENADOR,
  ROLE_CODES.RECEPCION,
  ROLE_CODES.PSICOLOGO,
  ROLE_CODES.NEUROPSICOLOGO,
  ROLE_CODES.FISIOTERAPEUTA,
  ROLE_CODES.ADMINISTRADOR,
];

describe('Regla: solo USUARIO es auto-asignable', () => {
  it('public registration grants exactly the USUARIO role', () => {
    const user = buildUser();
    expect(user.listRoleCodes()).toEqual([ROLE_CODES.USUARIO]);
  });

  it.each(NON_SELF_ASSIGNABLE_ROLES)(
    'rejects self-assignment of %s when the grantor is not an admin',
    (roleCode) => {
      const user = buildUser();
      expect(() => grantRole(user, roleCode, false)).toThrow(SelfAssignmentForbidden);
      expect(user.hasRole(roleCode)).toBe(false);
    },
  );

  it.each(NON_SELF_ASSIGNABLE_ROLES)('allows an admin to grant %s', (roleCode) => {
    const user = buildUser();
    grantRole(user, roleCode, true);
    expect(user.hasRole(roleCode)).toBe(true);
  });

  it('a user can never end up with zero roles', () => {
    const user = buildUser();
    expect(() => user.revokeRole(ROLE_CODES.USUARIO)).toThrow();
    expect(user.hasRole(ROLE_CODES.USUARIO)).toBe(true);
  });

  it('normalizes email by trimming and lowercasing', () => {
    const user = buildUser();
    expect(user.email).toBe('jugador@example.com');
  });
});
