/**
 * Identity's own narrow window into booking's reservation-history concept,
 * used to compute achievement badges (Phase 2). Own copy, not shared with
 * the goals module's identically-shaped port.
 */
export class TrainingFrequencyProvider {
  /** @returns {Promise<{count: number}>} */
  async getMyTrainingFrequency(_playerId, _days) {
    throw new Error('Not implemented');
  }
}
