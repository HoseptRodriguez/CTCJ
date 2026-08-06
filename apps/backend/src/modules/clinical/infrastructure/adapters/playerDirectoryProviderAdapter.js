/**
 * The one place clinical's infrastructure is allowed to know identity
 * exists for user-directory lookups. Imports identity's application layer,
 * never its persistence, matching every other module's identical adapter.
 *
 * @param {{ getUserSummaries: (input: { userIds: string[] }) => Promise<{id: string, firstName: string, lastName: string, email: string}[]> }} deps
 * @returns {import('../../application/ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider}
 */
export function createIdentityPlayerDirectoryProvider({ getUserSummaries }) {
  return {
    async getPlayerSummaries(userIds) {
      const summaries = await getUserSummaries({ userIds });
      return new Map(summaries.map((s) => [s.id, s]));
    },
  };
}
