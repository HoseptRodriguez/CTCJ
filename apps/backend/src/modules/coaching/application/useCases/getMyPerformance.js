import { derivePerformanceSummary } from './derivePerformanceSummary.js';

/**
 * Self-service: the caller's own full rating history plus the derived
 * summary -- same shape as listPlayerPerformance.js, no visibility filtering
 * (unlike getMyNotes.js): the real doc says the player sees this dashboard,
 * nothing suggests hiding any of it from them. `playerId` is scoped by the
 * HTTP controller to req.user.id, never client-supplied.
 * @param {{ performanceRatingRepository: import('../ports/PerformanceRatingRepository.js').PerformanceRatingRepository }} deps
 */
export function createGetMyPerformance({ performanceRatingRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyPerformance({ playerId }) {
    const ratings = await performanceRatingRepository.listByPlayer(playerId);
    return { ratings, summary: derivePerformanceSummary(ratings) };
  };
}
