/**
 * For the staff directory: the categories each player has played in the
 * open season (derived from real matches, like the player's own summary).
 *
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createGetPlayerCategories({
  competitionMatchRepository,
  seasonRepository,
  clubId,
}) {
  /** @param {{ playerIds: string[] }} input @returns {Promise<Map<string, string[]>>} */
  return async function getPlayerCategories({ playerIds }) {
    const wanted = new Set(playerIds);
    const result = new Map();
    const season = await seasonRepository.findOpenByClub(clubId);
    if (!season || wanted.size === 0) return result;
    const matches = await competitionMatchRepository.list({ seasonId: season.id });
    for (const match of matches) {
      for (const playerId of [...match.participantsA, ...match.participantsB]) {
        if (!wanted.has(playerId)) continue;
        const list = result.get(playerId) ?? [];
        if (!list.includes(match.category)) list.push(match.category);
        result.set(playerId, list);
      }
    }
    return result;
  };
}
