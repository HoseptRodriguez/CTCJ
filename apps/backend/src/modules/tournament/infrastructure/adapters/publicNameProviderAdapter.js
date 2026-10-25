import { publicPlayerName } from '../../domain/policies/publicPlayerName.js';

/**
 * Public display names (identity): the person's name, and whether it may
 * be shown in full (adults always; minors only with the guardian's
 * authorization).
 *
 * @param {{ getUserSummaries: (input: { userIds: string[] }) => Promise<Array<{ id: string, firstName: string, lastName: string }>>,
 *   fullNameAllowedFor: (input: { userIds: string[] }) => Promise<Set<string>> }} deps
 */
export function createIdentityPublicNameProvider({ getUserSummaries, fullNameAllowedFor }) {
  return {
    async displayNames(playerIds) {
      if (playerIds.length === 0) return new Map();
      const [summaries, allowed] = await Promise.all([
        getUserSummaries({ userIds: playerIds }),
        fullNameAllowedFor({ userIds: playerIds }),
      ]);
      return new Map(summaries.map((s) => [s.id, publicPlayerName(s, allowed.has(s.id))]));
    },
  };
}
