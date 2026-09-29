import { ROLE_CODES } from '@ctcj/shared';

import { UserStatus } from '../../domain/entities/User.js';
import { AccountAnonymized } from '../errors/AccountAnonymized.js';
import { CannotChangeOwnAccount } from '../errors/CannotChangeOwnAccount.js';
import { EmailAlreadyVerified } from '../errors/EmailAlreadyVerified.js';
import { RoleAlreadyAssigned } from '../errors/RoleAlreadyAssigned.js';
import { RoleNotAssigned } from '../errors/RoleNotAssigned.js';
import { UserNotFound } from '../errors/UserNotFound.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * What the staff can do to an account from its file: give or take the
 * player role, deactivate or reactivate it, and send the verification email
 * again. Every action is written to audit_logs (who, when, before, after).
 * The routes decide who may call each one; nobody acts on their own account.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   emailVerificationRepository: import('../ports/EmailVerificationRepository.js').EmailVerificationRepository,
 *   emailSender: import('../ports/EmailSender.js').EmailSender,
 *   tokenService: import('../ports/TokenService.js').TokenService,
 *   auditLog: import('../ports/IdentityAuditLog.js').IdentityAuditLog,
 *   clock: import('../ports/Clock.js').Clock,
 *   appPublicUrl: string,
 * }} deps
 */
export function createStaffAccountActions({
  userRepository,
  refreshTokenRepository,
  emailVerificationRepository,
  emailSender,
  tokenService,
  auditLog,
  clock,
  appPublicUrl,
}) {
  async function target(actor, userId) {
    if (actor.userId === userId) throw new CannotChangeOwnAccount();
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFound();
    return user;
  }

  const audit = (actor, action, userId, before, after) =>
    auditLog.record({
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      action,
      entityType: 'user',
      entityId: userId,
      before,
      after,
    });

  return {
    /**
     * @param {{ actor: { userId: string, roles: string[] }, userId: string, grant: boolean }} input
     */
    async setPlayerRole({ actor, userId, grant }) {
      const user = await target(actor, userId);
      const has = user.hasRole(ROLE_CODES.JUGADOR);
      if (grant && has) throw new RoleAlreadyAssigned();
      if (!grant && !has) throw new RoleNotAssigned();
      const before = user.listRoleCodes();
      if (grant) {
        user.grantRole(ROLE_CODES.JUGADOR, true);
        await userRepository.addRoleGrant(userId, ROLE_CODES.JUGADOR, actor.userId);
      } else {
        user.revokeRole(ROLE_CODES.JUGADOR); // never leaves someone without a role
        await userRepository.revokeRoleGrant(userId, ROLE_CODES.JUGADOR, actor.userId);
      }
      await audit(
        actor,
        grant ? 'user.role.grant' : 'user.role.revoke',
        userId,
        { roles: before },
        { roles: user.listRoleCodes() },
      );
      return { userId, isJugador: grant };
    },

    /**
     * Deactivating closes every session and the account can't sign in; its
     * data stays. Reactivating returns it to where it was (verified or not).
     * An anonymized (deleted) account can't come back.
     * @param {{ actor: { userId: string, roles: string[] }, userId: string, active: boolean }} input
     */
    async setAccountActive({ actor, userId, active }) {
      const user = await target(actor, userId);
      const before = user.status;
      if (active) {
        if (user.deletedAt) throw new AccountAnonymized();
        user.status = user.emailVerifiedAt ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION;
      } else {
        user.status = UserStatus.DEACTIVATED;
      }
      await userRepository.update(user);
      if (!active) await refreshTokenRepository.revokeAllForUser(userId);
      await audit(
        actor,
        active ? 'user.reactivate' : 'user.deactivate',
        userId,
        {
          status: before,
        },
        { status: user.status },
      );
      return { userId, active, status: user.status };
    },

    /**
     * A new verification link for someone who never confirmed their email
     * (the previous links stop mattering once one is used).
     * @param {{ actor: { userId: string, roles: string[] }, userId: string }} input
     */
    async resendVerification({ actor, userId }) {
      const user = await target(actor, userId);
      if (user.emailVerifiedAt) throw new EmailAlreadyVerified();
      const rawToken = tokenService.generateOpaqueToken();
      const tokenHash = tokenService.hashOpaqueToken(rawToken);
      const expiresAt = new Date(clock.now().getTime() + VERIFICATION_TOKEN_TTL_MS);
      await emailVerificationRepository.create(user.id, tokenHash, expiresAt);
      await emailSender.sendVerificationEmail(
        user.email,
        `${appPublicUrl}/verify-email?token=${rawToken}`,
      );
      await audit(actor, 'user.verification.resend', userId, null, { sentAt: clock.now() });
      return { userId, sent: true };
    },

    /** Records a directory export (who, when, which filters, how many rows). */
    async recordDirectoryExport({ actor, filters, rows }) {
      await auditLog.record({
        actorUserId: actor.userId,
        actorRoles: actor.roles,
        action: 'users.export',
        entityType: 'user_directory',
        entityId: null,
        before: null,
        after: { filters, rows },
      });
    },
  };
}
