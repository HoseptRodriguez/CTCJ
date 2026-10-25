/** Whether an account belongs to a minor (identity decides how). Fails closed. */
export class MinorStatusProvider {
  /** @returns {Promise<boolean>} */
  async isMinor(_userId) {
    throw new Error('Not implemented');
  }

  /**
   * A minor whose guardian hasn't linked the account and authorized the
   * minor's data and image yet. Fails closed.
   * @returns {Promise<boolean>}
   */
  async isPendingGuardianAuthorization(_userId) {
    throw new Error('Not implemented');
  }
}
