/**
 * @typedef {import('../../domain/entities/CompetitionSeason.js').CompetitionSeason} CompetitionSeason
 */

export class SeasonRepository {
  /** @returns {Promise<CompetitionSeason>} */
  async create(_season) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CompetitionSeason|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CompetitionSeason|null>} the club's current OPEN season, if any */
  async findOpenByClub(_clubId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CompetitionSeason[]>} newest first (year desc, seasonNumber desc) */
  async listByClub(_clubId) {
    throw new Error('Not implemented');
  }

  /** Persists close() field changes made via the domain entity's transition method. @returns {Promise<CompetitionSeason>} */
  async update(_season) {
    throw new Error('Not implemented');
  }
}
