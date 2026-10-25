/**
 * Staff: the tournaments a player takes part in, for their file.
 *
 * @param {{ tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository, clubId: string }} deps
 */
export function createListPlayerTournaments({ tournamentRepository, clubId }) {
  /** @param {{ playerId: string }} input */
  return async function listPlayerTournaments({ playerId }) {
    const tournaments = await tournamentRepository.listByPlayer(clubId, playerId);
    return tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      modality: t.modality,
      status: t.status,
      createdAt: t.createdAt,
    }));
  };
}
