/**
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   clubId: string,
 * }} deps
 */
export function createListTournaments({ tournamentRepository, clubId }) {
  /** Bare list, no participant/match detail -- no PII, safe to expose publicly. */
  return async function listTournaments() {
    return tournamentRepository.listByClub(clubId);
  };
}
