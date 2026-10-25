/**
 * Privacy's view of identity's getUserSummaries (application layer only).
 *
 * @param {{ getUserSummaries: (input: { userIds: string[] }) =>
 *   Promise<{ id: string, firstName: string, lastName: string, email: string }[]> }} deps
 * @returns {import('../../application/ports/PersonDirectory.js').PersonDirectory}
 */
export function createIdentityPersonDirectory({ getUserSummaries }) {
  return {
    async getSummaries(userIds) {
      const rows = await getUserSummaries({ userIds });
      return new Map(
        rows.map((r) => [r.id, { firstName: r.firstName, lastName: r.lastName, email: r.email }]),
      );
    },
  };
}
