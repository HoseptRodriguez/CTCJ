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

  /**
   * Self-service dashboard support: every non-void match a player took part
   * in during a season, across every category/modality (unlike list(),
   * which always requires one specific category+modality) -- the player
   * doesn't know upfront which categories they've played in, so this
   * discovers that instead of requiring it as an input.
   * @returns {Promise<CompetitionMatch[]>} newest played first
   */
  async listByPlayer(_seasonId, _playerId) {
    throw new Error('Not implemented');
  }
}
