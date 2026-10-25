/** Bridges booking's PlayerDirectoryProvider port to identity's getUserSummaries (wired in app.js). */
export function createIdentityPlayerDirectoryProvider({ getUserSummaries }) {
  return {
    async getPlayerSummaries(userIds) {
      const summaries = await getUserSummaries({ userIds });
      return new Map(summaries.map((s) => [s.id, s]));
    },
  };
}
