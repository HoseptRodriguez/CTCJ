import { TournamentNotFound } from '../errors/TournamentNotFound.js';

/**
 * Full bracket view: the tournament, every participant (name-enriched),
 * and every match. Mirrors billing's/competition's PlayerDirectoryProvider
 * enrichment pattern.
 *
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createGetTournament({ tournamentRepository, playerDirectoryProvider }) {
  /** @param {{ tournamentId: string }} input */
  return async function getTournament({ tournamentId }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }

    const [participants, matches] = await Promise.all([
      tournamentRepository.listParticipants(tournamentId),
      tournamentRepository.listMatches(tournamentId),
    ]);

    const allPlayerIds = [...new Set(participants.flatMap((p) => p.playerIds))];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(allPlayerIds);

    const enrichedParticipants = participants.map((p) => ({
      ...p,
      members: p.playerIds.map((playerId) => {
        const summary = summaries.get(playerId) ?? null;
        return {
          playerId,
          firstName: summary?.firstName ?? null,
          lastName: summary?.lastName ?? null,
        };
      }),
    }));

    return { tournament, participants: enrichedParticipants, matches };
  };
}
