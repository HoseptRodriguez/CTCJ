/**
 * @param {{
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createListSeasons({ seasonRepository, clubId }) {
  return async function listSeasons() {
    return seasonRepository.listByClub(clubId);
  };
}
