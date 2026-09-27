/** Whether an account belongs to a minor (identity decides how). Fails closed. */
export class MinorStatusProvider {
  /** @returns {Promise<boolean>} */
  async isMinor(_userId) {
    throw new Error('Not implemented');
  }
}
