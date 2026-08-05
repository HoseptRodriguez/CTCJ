import { computeStandings } from '../../domain/services/computeStandings.js';

/**
 * @param {{
 *   competitionMatchRepository: import('../ports/CompetitionMatchRepository.js').CompetitionMatchRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 *   seasonRepository: import('../ports/SeasonRepository.js').SeasonRepository,
 *   clubId: string,
 * }} deps
 */
export function createGetStandings({
  competitionMatchRepository,
  playerDirectoryProvider,
  seasonRepository,
  clubId,
}) {
  /** @param {{ seasonId?: string, category: string, modality: string }} input seasonId omitted = current OPEN season */
  return async function getStandings({ seasonId, category, modality }) {
    const resolvedSeasonId = seasonId ?? (await seasonRepository.findOpenByClub(clubId))?.id;
    if (!resolvedSeasonId) {
      return []; // no season to look at yet -- an empty state, not an error
    }

    const matches = await competitionMatchRepository.list({
      seasonId: resolvedSeasonId,
      category,
      modality,
      includeVoid: false,
    });

    const allIds = [...new Set(matches.flatMap((m) => [...m.participantsA, ...m.participantsB]))];
    const playerSummaries = await playerDirectoryProvider.getPlayerSummaries(allIds);
    const namesById = new Map(
      [...playerSummaries.entries()].map(([id, p]) => [id, `${p.firstName} ${p.lastName}`]),
    );

    return computeStandings(matches, namesById);
  };
}
