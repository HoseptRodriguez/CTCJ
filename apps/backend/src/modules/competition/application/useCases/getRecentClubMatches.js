const DEFAULT_LIMIT = 15;

/**
 * Club Activity feed support (Phase 3b): recent match results club-wide,
 * across every category/modality, enriched with participant names --
 * mirrors getMyCompetitionSummary.js's own enrichment shape. Unlike
 * listMatches.js (which requires one specific category+modality and
 * includes VOID matches for the staff VOID-badge UI), this is a
 * player-facing feed: VOID matches are excluded (matches
 * getMyCompetitionSummary's precedent, not listMatches's).
 *
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createGetRecentClubMatches({
  competitionMatchRepository,
  playerDirectoryProvider,
  seasonRepository,
  clubId,
}) {
  /** @param {{ limit?: number }} [input] */
  return async function getRecentClubMatches({ limit = DEFAULT_LIMIT } = {}) {
    const season = await seasonRepository.findOpenByClub(clubId);
    if (!season) {
      return { matches: [] };
    }

    const matches = await competitionMatchRepository.listRecentByClub(season.id, limit);

    const allIds = [...new Set(matches.flatMap((m) => [...m.participantsA, ...m.participantsB]))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(allIds);
    function enrichSide(ids) {
      return ids.map((id) => {
        const p = playerSummaries.get(id) ?? null;
        return { playerId: id, firstName: p?.firstName ?? null, lastName: p?.lastName ?? null };
      });
    }

    return {
      matches: matches.map((match) => ({
        ...match,
        participantsA: enrichSide(match.participantsA),
        participantsB: enrichSide(match.participantsB),
      })),
    };
  };
}
