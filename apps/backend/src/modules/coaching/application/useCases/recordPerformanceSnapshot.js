import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * @param {{
 *   performanceRatingRepository: import('../ports/PerformanceRatingRepository.js').PerformanceRatingRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 * }} deps
 */
export function createRecordPerformanceSnapshot({
  performanceRatingRepository,
  playerEligibilityProvider,
}) {
  /**
   * @param {{ playerId: string, ratings: Record<string, number>, coachUserId: string }} input
   */
  return async function recordPerformanceSnapshot({ playerId, ratings, coachUserId }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }

    return performanceRatingRepository.createBatch({
      playerId,
      coachId: coachUserId,
      ratings,
    });
  };
}
