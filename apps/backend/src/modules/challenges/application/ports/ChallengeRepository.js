/**
 * @typedef {import('../../domain/entities/Challenge.js').Challenge} Challenge
 */

export class ChallengeRepository {
  /** @returns {Promise<Challenge>} */
  async create(_challenge) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Challenge|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Both directions -- any PENDING challenge between this pair of users,
   * regardless of who challenged whom. @returns {Promise<Challenge|null>} */
  async findActiveBetween(_userIdA, _userIdB) {
    throw new Error('Not implemented');
  }

  /** Every challenge the user is party to, either side, newest first.
   * @returns {Promise<Challenge[]>} */
  async listByParticipant(_userId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Challenge>} */
  async update(_challenge) {
    throw new Error('Not implemented');
  }
}
