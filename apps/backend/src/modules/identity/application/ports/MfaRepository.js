/**
 * Two-step verification state of a person (columns of users + the
 * mfa_recovery_codes table).
 */
export class MfaRepository {
  /**
   * @returns {Promise<{ enabled: boolean, secret: string|null, enabledAt: Date|null,
   *   failedCount: number, lockedUntil: Date|null, lastStep: number|null,
   *   recoveryCodesLeft: number }>}
   */
  async getState(_userId) {
    throw new Error('Not implemented');
  }

  /** Stores a new (not yet confirmed) encrypted secret; MFA stays off. */
  async savePendingSecret(_userId, _encryptedSecret) {
    throw new Error('Not implemented');
  }

  /** Turns it on and replaces the recovery codes: { now, lastStep, recoveryCodeHashes }. */
  async enable(_userId, _change) {
    throw new Error('Not implemented');
  }

  /** Turns it off: clears the secret, the counters and every recovery code. */
  async disable(_userId) {
    throw new Error('Not implemented');
  }

  /** { failedCount, lockedUntil } */
  async recordFailure(_userId, _change) {
    throw new Error('Not implemented');
  }

  /** A good code: clears the failures and remembers the step used ({ lastStep }). */
  async recordSuccess(_userId, _change) {
    throw new Error('Not implemented');
  }

  async replaceRecoveryCodes(_userId, _hashes) {
    throw new Error('Not implemented');
  }

  /** Marks an unused code as used. @returns {Promise<boolean>} whether one matched */
  async useRecoveryCode(_userId, _hash, _now) {
    throw new Error('Not implemented');
  }
}
