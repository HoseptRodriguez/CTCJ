/**
 * Names of players, for staff-facing views only (who to charge at the front
 * desk). Implemented by an adapter over identity's getUserSummaries.
 */
export class PlayerDirectoryProvider {
  /** @returns {Promise<Map<string, {id: string, firstName: string, lastName: string}>>} */
  async getPlayerSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
