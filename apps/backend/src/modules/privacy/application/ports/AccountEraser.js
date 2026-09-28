/**
 * Deletes a person's account (identity anonymizes it, community deletes
 * their content). app.js wires it; unwired, it refuses.
 */
export class AccountEraser {
  /** @returns {Promise<void>} */
  async eraseAccount(_userId) {
    throw new Error('Not implemented');
  }
}
