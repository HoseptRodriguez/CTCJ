/**
 * @typedef {import('../../domain/entities/ChallengeMatchResult.js').ChallengeMatchResult} ChallengeMatchResult
 */

export class ChallengeMatchResultRepository {
  /** @returns {Promise<ChallengeMatchResult|null>} */
  async findByChallengeId(_challengeId) {
    throw new Error('Not implemented');
  }

  /** Batch form for enrichment (mirrors PlayerDirectoryProvider.getPlayerSummaries'
   * Map-returning convention). @returns {Promise<Map<string, ChallengeMatchResult>>} */
  async findByChallengeIds(_challengeIds) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ChallengeMatchResult>} */
  async create(_result) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ChallengeMatchResult>} */
  async update(_result) {
    throw new Error('Not implemented');
  }
}
