/**
 * @typedef {import('../../domain/entities/CompetitionMatch.js').CompetitionMatch} CompetitionMatch
 */

export class CompetitionMatchRepository {
  /** Persists a new RECORDED match and its participant rows transactionally. @returns {Promise<CompetitionMatch>} */
  async create(_match) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CompetitionMatch|null>} with participantsA/participantsB populated */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists voidOut() field changes made via the domain entity's transition method. @returns {Promise<CompetitionMatch>} */
  async update(_match) {
    throw new Error('Not implemented');
  }

  /**
   * @param {{ seasonId: string, category: string, modality: string, playerId?: string, includeVoid?: boolean }} filters
   * @returns {Promise<CompetitionMatch[]>} newest played first, each with participantsA/participantsB populated
   */
  async list(_filters) {
    throw new Error('Not implemented');
  }
}
