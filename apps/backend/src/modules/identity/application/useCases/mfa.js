import {
  MFA_LOCK_MINUTES,
  MFA_MAX_FAILED_ATTEMPTS,
  MFA_RECOVERY_CODE_COUNT,
  isMfaRequiredFor,
} from '@ctcj/shared';

import {
  generateRecoveryCodes,
  generateTotpSecret,
  normalizeRecoveryCode,
  otpauthUri,
  verifyTotp,
} from '../../domain/services/totp.js';
import { CannotChangeOwnAccount } from '../errors/CannotChangeOwnAccount.js';
import { MfaAlreadyEnabled } from '../errors/MfaAlreadyEnabled.js';
import { MfaCodeInvalid } from '../errors/MfaCodeInvalid.js';
import { MfaLocked } from '../errors/MfaLocked.js';
import { MfaNotEnabled } from '../errors/MfaNotEnabled.js';
import { MfaRequiredForRole } from '../errors/MfaRequiredForRole.js';
import { MfaSetupNotStarted } from '../errors/MfaSetupNotStarted.js';
import { UserNotFound } from '../errors/UserNotFound.js';

const ISSUER = 'Club de Tenis Ciudad Jardín';

/**
 * Two-step verification with an authenticator app (TOTP).
 *
 * - Turning it on: a new secret (encrypted at rest) → the person scans the QR
 *   and types a code → it's on, and they get 10 one-time recovery codes,
 *   shown once and stored only as a keyed hash.
 * - Every code (app or recovery) counts toward a limit: 5 wrong in a row
 *   lock it for 15 minutes. A used app code can't be used again.
 * - Mandatory for Administración, Psicología, Neuropsicología and
 *   Fisioterapia (they can't turn it off); optional for the rest.
 * - Turning on, off, resetting, using a recovery code and a lock are
 *   written to audit_logs.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   mfaRepository: import('../ports/MfaRepository.js').MfaRepository,
 *   mfaCrypto: import('../ports/MfaCrypto.js').MfaCrypto,
 *   qrRenderer: { toSvg: (text: string) => Promise<string> },
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   auditLog: import('../ports/IdentityAuditLog.js').IdentityAuditLog,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createMfaUseCases({
  userRepository,
  mfaRepository,
  mfaCrypto,
  qrRenderer,
  refreshTokenRepository,
  auditLog,
  clock,
}) {
  async function userOrFail(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFound();
    return user;
  }

  const audit = (user, action, after = null, actor = null) =>
    auditLog.record({
      actorUserId: actor?.userId ?? user.id,
      actorRoles: actor?.roles ?? user.listRoleCodes(),
      action,
      entityType: 'user',
      entityId: user.id,
      before: null,
      after,
    });

  function newRecoveryCodes() {
    const codes = generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
    return {
      codes,
      hashes: codes.map((c) => mfaCrypto.hashRecoveryCode(normalizeRecoveryCode(c))),
    };
  }

  /**
   * Checks an app code or a recovery code against the limit of attempts.
   * @returns {Promise<{ usedRecoveryCode: boolean, recoveryCodesLeft: number }>}
   */
  async function checkCode(user, { code, recoveryCode }) {
    const state = await mfaRepository.getState(user.id);
    if (!state.enabled) throw new MfaNotEnabled();
    const now = clock.now();
    if (state.lockedUntil && state.lockedUntil > now) throw new MfaLocked(state.lockedUntil);

    let step = null;
    let usedRecoveryCode = false;
    if (recoveryCode) {
      const hash = mfaCrypto.hashRecoveryCode(normalizeRecoveryCode(recoveryCode));
      usedRecoveryCode = await mfaRepository.useRecoveryCode(user.id, hash, now);
    } else {
      const secret = mfaCrypto.decryptSecret(state.secret);
      step = verifyTotp(secret, code, now, { lastUsedStep: state.lastStep });
    }

    if (step == null && !usedRecoveryCode) {
      const failedCount =
        (state.lockedUntil && state.lockedUntil <= now ? 0 : state.failedCount) + 1;
      const locked = failedCount >= MFA_MAX_FAILED_ATTEMPTS;
      const lockedUntil = locked ? new Date(now.getTime() + MFA_LOCK_MINUTES * 60_000) : null;
      await mfaRepository.recordFailure(user.id, {
        failedCount: locked ? 0 : failedCount,
        lockedUntil,
      });
      if (locked) {
        await audit(user, 'mfa.lockout', { lockedUntil });
        throw new MfaLocked(lockedUntil);
      }
      throw new MfaCodeInvalid();
    }

    await mfaRepository.recordSuccess(user.id, { lastStep: step });
    const recoveryCodesLeft = usedRecoveryCode
      ? state.recoveryCodesLeft - 1
      : state.recoveryCodesLeft;
    if (usedRecoveryCode) await audit(user, 'mfa.recovery_code.use', { recoveryCodesLeft });
    return { usedRecoveryCode, recoveryCodesLeft };
  }

  return {
    /** @param {{ userId: string }} input */
    async getMfaStatus({ userId }) {
      const user = await userOrFail(userId);
      const state = await mfaRepository.getState(userId);
      return {
        enabled: state.enabled,
        enabledAt: state.enabledAt,
        required: isMfaRequiredFor(user.listRoleCodes()),
        recoveryCodesLeft: state.enabled ? state.recoveryCodesLeft : 0,
      };
    },

    /** Step 1: a new secret and its QR code. @param {{ userId: string }} input */
    async startMfaSetup({ userId }) {
      const user = await userOrFail(userId);
      const state = await mfaRepository.getState(userId);
      if (state.enabled) throw new MfaAlreadyEnabled();
      const secret = generateTotpSecret();
      await mfaRepository.savePendingSecret(userId, mfaCrypto.encryptSecret(secret));
      const uri = otpauthUri({ secret, accountName: user.email, issuer: ISSUER });
      return {
        // Shown in groups of 4 so it's easy to type by hand.
        manualKey: secret.match(/.{1,4}/g).join(' '),
        qrSvg: await qrRenderer.toSvg(uri),
        issuer: ISSUER,
        accountName: user.email,
      };
    },

    /**
     * Step 2: the first code from the app turns it on.
     * @param {{ userId: string, code: string }} input
     * @returns {Promise<{ recoveryCodes: string[] }>} shown ONCE
     */
    async confirmMfaSetup({ userId, code }) {
      const user = await userOrFail(userId);
      const state = await mfaRepository.getState(userId);
      if (state.enabled) throw new MfaAlreadyEnabled();
      if (!state.secret) throw new MfaSetupNotStarted();
      const now = clock.now();
      if (state.lockedUntil && state.lockedUntil > now) throw new MfaLocked(state.lockedUntil);
      const step = verifyTotp(mfaCrypto.decryptSecret(state.secret), code, now);
      if (step == null) {
        const failedCount = state.failedCount + 1;
        const locked = failedCount >= MFA_MAX_FAILED_ATTEMPTS;
        await mfaRepository.recordFailure(userId, {
          failedCount: locked ? 0 : failedCount,
          lockedUntil: locked ? new Date(now.getTime() + MFA_LOCK_MINUTES * 60_000) : null,
        });
        throw new MfaCodeInvalid();
      }
      const { codes, hashes } = newRecoveryCodes();
      await mfaRepository.enable(userId, { now, lastStep: step, recoveryCodeHashes: hashes });
      await audit(user, 'mfa.enable', { recoveryCodes: codes.length });
      return { recoveryCodes: codes };
    },

    /**
     * Sign-in, second step: an app code or a recovery code.
     * @param {{ userId: string, code?: string, recoveryCode?: string }} input
     */
    async verifyMfaCode({ userId, code, recoveryCode }) {
      const user = await userOrFail(userId);
      return checkCode(user, { code, recoveryCode });
    },

    /** Optional roles only; needs a current code. */
    async disableMfa({ userId, code }) {
      const user = await userOrFail(userId);
      if (isMfaRequiredFor(user.listRoleCodes())) throw new MfaRequiredForRole();
      await checkCode(user, { code });
      await mfaRepository.disable(userId);
      await audit(user, 'mfa.disable');
      return { enabled: false };
    },

    /** New set of 10 recovery codes (the old ones stop working). */
    async regenerateRecoveryCodes({ userId, code }) {
      const user = await userOrFail(userId);
      await checkCode(user, { code });
      const { codes, hashes } = newRecoveryCodes();
      await mfaRepository.replaceRecoveryCodes(userId, hashes);
      await audit(user, 'mfa.recovery_codes.regenerate', { recoveryCodes: codes.length });
      return { recoveryCodes: codes };
    },

    /**
     * Administración resets another person's two-step verification (a lost
     * phone): it's turned off, their sessions are closed, and at the next
     * sign-in they set it up again (if their role requires it).
     * @param {{ actor: { userId: string, roles: string[] }, userId: string }} input
     */
    async resetMfa({ actor, userId }) {
      if (actor.userId === userId) throw new CannotChangeOwnAccount();
      const user = await userOrFail(userId);
      const state = await mfaRepository.getState(userId);
      if (!state.enabled && !state.secret) throw new MfaNotEnabled();
      await mfaRepository.disable(userId);
      await refreshTokenRepository.revokeAllForUser(userId);
      await audit(user, 'mfa.reset', { by: actor.userId }, actor);
      return { userId, enabled: false };
    },
  };
}
