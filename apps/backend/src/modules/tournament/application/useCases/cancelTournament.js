import { TournamentNotFound } from '../errors/TournamentNotFound.js';

/**
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCancelTournament({ tournamentRepository, clock }) {
  /** @param {{ tournamentId: string }} input */
  return async function cancelTournament({ tournamentId }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }

    tournament.cancel({ now: clock.now() }); // throws InvalidTournamentState

    return tournamentRepository.update(tournament);
  };
}
