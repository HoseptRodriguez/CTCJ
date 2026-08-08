/**
 * The one place challenges' infrastructure is allowed to know identity
 * exists for player-directory lookups. Imports identity's application layer
 * (a plain use-case function), never identity's persistence -- legal under
 * .dependency-cruiser.js's rules, matching every other module's identical
 * PlayerDirectoryProvider adapter.
 *
 * @param {{ getUserSummaries: (input: { userIds: string[] }) => Promise<{id: string, firstName: string, lastName: string}[]> }} deps
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
