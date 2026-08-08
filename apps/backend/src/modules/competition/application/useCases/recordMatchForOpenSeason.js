import { NoOpenSeason } from '../errors/NoOpenSeason.js';

/**
 * Internal-only (no HTTP route) composition over the existing recordMatch
 * use case: resolves the club's current OPEN season itself instead of
 * requiring an explicit seasonId, since callers of this one (challenges'
 * confirmed-score flow, via MatchRecorder) have no concept of "seasons" at
 * all -- that's staff-facing UI, unlike recordMatch's own HTTP action
 * which still requires seasonId explicitly and is unaffected by this.
 *
 * @param {{
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   recordMatch: ReturnType<typeof import('./recordMatch.js').createRecordMatch>,
 *   clubId: string,
 * }} deps
 */
export function createRecordMatchForOpenSeason({ seasonRepository, recordMatch, clubId }) {
  /**
   * @param {Omit<Parameters<typeof recordMatch>[0], 'seasonId'>} input
   */
  return async function recordMatchForOpenSeason(input) {
    const season = await seasonRepository.findOpenByClub(clubId);
    if (!season) {
      throw new NoOpenSeason();
    }
    return recordMatch({ ...input, seasonId: season.id });
  };
}
