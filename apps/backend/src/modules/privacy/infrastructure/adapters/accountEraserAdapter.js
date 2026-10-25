/**
 * Deleting an account touches two modules through their application
 * layers: community deletes what the person published, then identity
 * anonymizes the account (so nothing is left pointing to a real name).
 *
 * @param {{
 *   eraseMemberContent: (input: { userId: string }) => Promise<unknown>,
 *   anonymizeAccount: (input: { userId: string }) => Promise<unknown>,
 * }} deps
 * @returns {import('../../application/ports/AccountEraser.js').AccountEraser}
 */
export function createAccountEraser({ eraseMemberContent, anonymizeAccount }) {
  return {
    async eraseAccount(userId) {
      await eraseMemberContent({ userId });
      await anonymizeAccount({ userId });
    },
  };
}
