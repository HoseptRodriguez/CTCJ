import { ROLE_CODES } from '@ctcj/shared';

import { SelfAssignmentForbidden } from '../errors/SelfAssignmentForbidden.js';
import { EmailNotVerified } from '../errors/EmailNotVerified.js';
import { MembershipNotApplicable } from '../errors/MembershipNotApplicable.js';
import { shouldLock, computeLockedUntil } from '../policies/lockoutPolicy.js';

import { Role } from './Role.js';

export const UserStatus = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

/**
 * Identity aggregate root. Framework-agnostic by construction: no Express,
 * Prisma, argon2 or jsonwebtoken imports anywhere in this file (enforced
 * mechanically by .dependency-cruiser.js).
 */
export class User {
  constructor({
    id,
    clubId,
    email,
    passwordHash,
    firstName,
    lastName,
    status = UserStatus.PENDING_VERIFICATION,
    roleCodes = [],
    failedLoginCount = 0,
    lockedUntil = null,
    lastLoginAt = null,
    emailVerifiedAt = null,
    membershipStatus = null,
    membershipStatusUpdatedAt = null,
    membershipStatusUpdatedBy = null,
  }) {
    this.id = id;
    this.clubId = clubId;
    this.email = User.normalizeEmail(email);
    this.passwordHash = passwordHash;
    this.firstName = firstName;
    this.lastName = lastName;
    this.status = status;
    this.roleCodes = new Set(roleCodes);
    this.failedLoginCount = failedLoginCount;
    this.lockedUntil = lockedUntil;
    this.lastLoginAt = lastLoginAt;
    this.emailVerifiedAt = emailVerifiedAt;
    this.membershipStatus = membershipStatus;
    this.membershipStatusUpdatedAt = membershipStatusUpdatedAt;
    this.membershipStatusUpdatedBy = membershipStatusUpdatedBy;
  }

  static normalizeEmail(email) {
    return String(email).trim().toLowerCase();
  }

  /** Public registration always creates exactly the self-assignable USUARIO role. */
  static registerPublic({ id, clubId, email, passwordHash, firstName, lastName }) {
    const user = new User({ id, clubId, email, passwordHash, firstName, lastName });
    user.roleCodes.add(ROLE_CODES.USUARIO);
    return user;
  }

  hasRole(roleCode) {
    return this.roleCodes.has(roleCode);
  }

  listRoleCodes() {
    return Array.from(this.roleCodes);
  }

  /**
   * RBAC barrier #2 (domain-level), independent of any route guard. Throws
   * SelfAssignmentForbidden unless the role is self-assignable or the
   * grantor is an administrator.
   */
  grantRole(roleCode, grantorIsAdmin) {
    const role = Role.fromCode(roleCode);
    if (!role.selfAssignable && !grantorIsAdmin) {
      throw new SelfAssignmentForbidden(roleCode);
    }
    this.roleCodes.add(role.code);
  }

  /** A user can never end up with zero roles. */
  revokeRole(roleCode) {
    if (this.roleCodes.size <= 1 && this.roleCodes.has(roleCode)) {
      throw new Error("Cannot revoke a user's only remaining role.");
    }
    this.roleCodes.delete(roleCode);
  }

  /** Idempotent: verifying an already-verified email is a no-op. */
  verifyEmail(now) {
    if (this.emailVerifiedAt) {
      return;
    }
    this.emailVerifiedAt = now;
    this.status = UserStatus.ACTIVE;
  }

  ensureEmailVerified() {
    if (!this.emailVerifiedAt) {
      throw new EmailNotVerified();
    }
  }

  isLocked(now) {
    return Boolean(this.lockedUntil && now < this.lockedUntil);
  }

  /** Increments the failure counter and locks the account per lockoutPolicy once the threshold is hit. */
  recordFailedLogin(now) {
    this.failedLoginCount += 1;
    this.lockedUntil = shouldLock(this.failedLoginCount)
      ? computeLockedUntil(this.failedLoginCount, now)
      : this.lockedUntil;
  }

  recordSuccessfulLogin(now) {
    this.failedLoginCount = 0;
    this.lockedUntil = null;
    this.lastLoginAt = now;
  }

  /**
   * Membership status is deliberately independent of `status` (account
   * verification lifecycle) and of role grants -- see constants/membership.js.
   * Only ever applies to academy players: throws MembershipNotApplicable for
   * anyone lacking JUGADOR, so an ADMINISTRADOR-only or plain USUARIO account
   * can never end up with a meaningless membership state. `status = null`
   * clears it (e.g. a JUGADOR who was never actually enrolled in a plan).
   */
  setMembershipStatus(status, updatedByUserId, now) {
    if (status != null && !this.hasRole(ROLE_CODES.JUGADOR)) {
      throw new MembershipNotApplicable();
    }
    this.membershipStatus = status;
    this.membershipStatusUpdatedAt = now;
    this.membershipStatusUpdatedBy = updatedByUserId;
  }
}
