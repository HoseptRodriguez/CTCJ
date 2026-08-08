/**
 * @typedef {import('../../domain/entities/Goal.js').Goal} Goal
 */

export class GoalRepository {
  /** @returns {Promise<Goal>} */
  async create(_goal) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Goal|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Goal[]>} */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Goal>} */
  async update(_goal) {
    throw new Error('Not implemented');
  }
}
