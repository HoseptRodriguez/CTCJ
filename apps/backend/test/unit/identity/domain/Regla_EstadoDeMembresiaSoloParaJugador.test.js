import { describe, expect, it } from 'vitest';
import { ROLE_CODES, MEMBERSHIP_STATUS } from '@ctcj/shared';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { MembershipNotApplicable } from '../../../../src/modules/identity/domain/errors/MembershipNotApplicable.js';

const NOW = new Date('2026-08-01T10:00:00Z');

function buildUser() {
  return User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'jugador@example.com',
    passwordHash: 'hash',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
}

describe('Regla: el estado de membresia solo aplica a JUGADOR', () => {
  it('sets the status and audit fields for a user holding JUGADOR', () => {
    const user = buildUser();
    user.roleCodes.add(ROLE_CODES.JUGADOR);

    user.setMembershipStatus(MEMBERSHIP_STATUS.OVERDUE, 'admin-1', NOW);

    expect(user.membershipStatus).toBe(MEMBERSHIP_STATUS.OVERDUE);
    expect(user.membershipStatusUpdatedAt).toBe(NOW);
    expect(user.membershipStatusUpdatedBy).toBe('admin-1');
  });

  it('rejects setting a non-null status on a user without JUGADOR', () => {
    const user = buildUser(); // only USUARIO
    expect(() => user.setMembershipStatus(MEMBERSHIP_STATUS.ACTIVE, 'admin-1', NOW)).toThrow(
      MembershipNotApplicable,
    );
  });

  it('allows clearing (null) even without JUGADOR -- null is always a no-op-safe value', () => {
    const user = buildUser();
    expect(() => user.setMembershipStatus(null, 'admin-1', NOW)).not.toThrow();
    expect(user.membershipStatus).toBeNull();
  });

  it('role and membership status are independently mutable -- granting JUGADOR does not set a default status', () => {
    const user = buildUser();
    user.roleCodes.add(ROLE_CODES.JUGADOR);
    expect(user.membershipStatus).toBeNull();
  });
});
