/**
 * @typedef {import('../../domain/entities/PlayerMembership.js').PlayerMembership} PlayerMembership
 */

export class MembershipRepository {
  /** @returns {Promise<PlayerMembership>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlayerMembership|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists status/endDate changes made via the domain entity's transition methods. @returns {Promise<PlayerMembership>} */
  async update(_membership) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<PlayerMembership[]>} */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
