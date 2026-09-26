/** "Apto / No apto para jugar" history; the newest row is the current status. */
export class FitnessStatusRepository {
  /** @returns {Promise<{status: string, unfitUntil: Date|null, createdAt: Date}|null>} */
  async findCurrent(_playerId) {
    throw new Error('Not implemented');
  }

  /** @param {{ playerId: string, practitionerId: string, status: string, unfitUntil: Date|null }} _record */
  async record(_record) {
    throw new Error('Not implemented');
  }
}
