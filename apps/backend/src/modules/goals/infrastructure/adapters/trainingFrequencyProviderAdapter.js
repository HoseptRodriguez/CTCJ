/**
 * The one place goals' infrastructure is allowed to know booking exists,
 * for TRAINING_FREQUENCY progress. Accepts the already-built use-case
 * function as a dependency, matching competitionProgressProviderAdapter.js's
 * identical pattern.
 *
 * @param {{ getMyTrainingFrequency: (input: { playerId: string, days?: number }) => Promise<{count: number}> }} deps
 * @returns {import('../../application/ports/TrainingFrequencyProvider.js').TrainingFrequencyProvider}
 */
export function createTrainingFrequencyProviderAdapter({ getMyTrainingFrequency }) {
  return {
    async getMyTrainingFrequency(playerId, days) {
      return getMyTrainingFrequency({ playerId, days });
    },
  };
}
