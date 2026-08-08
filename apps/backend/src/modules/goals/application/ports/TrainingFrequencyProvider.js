/**
 * Goals' own narrow window into booking's reservation-history concept, used
 * to compute TRAINING_FREQUENCY progress. Own copy, not shared with
 * identity's identically-shaped port (achievements).
 */
export class TrainingFrequencyProvider {
  /** @returns {Promise<{count: number}>} */
  async getMyTrainingFrequency(_playerId, _days) {
    throw new Error('Not implemented');
  }
}
