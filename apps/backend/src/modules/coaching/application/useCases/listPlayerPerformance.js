import { derivePerformanceSummary } from './derivePerformanceSummary.js';

/**
 * Staff-facing: full rating history for this player plus the derived
 * summary (strengths/weaknesses/progress) -- used on the staff lookup page
 * (ADMINISTRADOR/ENTRENADOR only, gated at the HTTP layer, not here).
 * @param {{ performanceRatingRepository: import('../ports/PerformanceRatingRepository.js').PerformanceRatingRepository }} deps
 */
export function createListPlayerPerformance({ performanceRatingRepository }) {
  /** @param {{ playerId: string }} input */
  return async function listPlayerPerformance({ playerId }) {
    const ratings = await performanceRatingRepository.listByPlayer(playerId);
    return { ratings, summary: derivePerformanceSummary(ratings) };
  };
}
