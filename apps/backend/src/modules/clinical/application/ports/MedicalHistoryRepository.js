/**
 * @typedef {import('../../domain/entities/MedicalHistoryEntry.js').MedicalHistoryEntry} MedicalHistoryEntry
 */
export class MedicalHistoryRepository {
  /** @returns {Promise<MedicalHistoryEntry>} */
  async create(_entry) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<MedicalHistoryEntry|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Persists resolve() field changes. @returns {Promise<MedicalHistoryEntry>} */
  async update(_entry) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<MedicalHistoryEntry[]>} every entry for this player, newest first */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<MedicalHistoryEntry[]>} only PLAYER_VISIBLE entries for this player, newest first */
  async listVisibleByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
