/**
 * The one place billing's infrastructure is allowed to know identity exists
 * for player-directory lookups. Imports identity's application layer (a
 * plain use-case function), never identity's persistence -- legal under
 * .dependency-cruiser.js's no-cross-module-persistence and application-no-infra
 * rules.
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
