/**
 * Competition categories each player has played in the open season
 * (competition decides). Display and filtering only: fails open (empty).
 */
export class PlayerCategoryProvider {
  /** @returns {Promise<Map<string, string[]>>} playerId -> categories */
  async getCategories(_playerIds) {
    throw new Error('Not implemented');
  }
}
