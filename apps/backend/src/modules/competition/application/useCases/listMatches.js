/**
 * Match history for a (season, category, modality) triple, optionally
 * scoped to one player. Includes VOID matches (the staff UI shows a VOID
 * badge) -- unlike getStandings, which excludes them. Each participant id is
 * enriched with the player's name via PlayerDirectoryProvider, mirroring
 * billing's listInvoices enrichment pattern.
 *
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createListMatches({
  competitionMatchRepository,
  playerDirectoryProvider,
  seasonRepository,
  clubId,
}) {
  /** @param {{ seasonId?: string, category: string, modality: string, playerId?: string }} input seasonId omitted = current OPEN season */
  return async function listMatches({ seasonId, category, modality, playerId }) {
    const resolvedSeasonId = seasonId ?? (await seasonRepository.findOpenByClub(clubId))?.id;
    if (!resolvedSeasonId) {
      return []; // no season to look at yet -- an empty state, not an error
    }

    const matches = await competitionMatchRepository.list({
      seasonId: resolvedSeasonId,
      category,
      modality,
      playerId,
      includeVoid: true,
    });

    const allIds = [...new Set(matches.flatMap((m) => [...m.participantsA, ...m.participantsB]))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(allIds);

    function enrichSide(ids) {
      return ids.map((id) => {
        const player = playerSummaries.get(id) ?? null;
        return {
          playerId: id,
          firstName: player?.firstName ?? null,
          lastName: player?.lastName ?? null,
        };
      });
    }

    return matches.map((match) => ({
      ...match,
      participantsA: enrichSide(match.participantsA),
      participantsB: enrichSide(match.participantsB),
    }));
  };
}
