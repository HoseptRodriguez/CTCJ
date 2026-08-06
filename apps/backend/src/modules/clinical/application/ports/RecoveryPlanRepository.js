/**
 * @typedef {import('../../domain/entities/RecoveryPlan.js').RecoveryPlan} RecoveryPlan
 */
export class RecoveryPlanRepository {
  /** @returns {Promise<RecoveryPlan>} */
  async create(_plan) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<RecoveryPlan|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists complete()/discontinue() field changes. @returns {Promise<RecoveryPlan>} */
  async update(_plan) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<RecoveryPlan[]>} every plan for this player, newest first */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<RecoveryPlan[]>} only PLAYER_VISIBLE plans for this player, newest first */
  async listVisibleByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
