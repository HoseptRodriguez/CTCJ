import { SeasonNotFound } from '../errors/SeasonNotFound.js';

/**
 * @param {{
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCloseSeason({ seasonRepository, clock }) {
  /** @param {{ seasonId: string, closedByUserId: string }} input */
  return async function closeSeason({ seasonId, closedByUserId }) {
    const season = await seasonRepository.findById(seasonId);
    if (!season) {
      throw new SeasonNotFound();
    }

    season.close({ closedBy: closedByUserId, now: clock.now() }); // throws InvalidSeasonState

    return seasonRepository.update(season);
  };
}
