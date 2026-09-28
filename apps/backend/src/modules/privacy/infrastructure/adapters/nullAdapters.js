/**
 * Safe defaults so buildPrivacyContainer() works standalone (tests)
 * without app.js's cross-module wiring.
 */
export function createNullPersonDirectory() {
  return {
    // Fails open (empty map) -- display enrichment only.
    async getSummaries() {
      return new Map();
    },
  };
}

export function createNullAccountEraser() {
  return {
    // Fails closed -- never pretends an account was deleted.
    async eraseAccount() {
      throw new Error('Account deletion is not wired (app.js supplies it).');
    },
  };
}
