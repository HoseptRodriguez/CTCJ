import { TournamentNotFound } from '../errors/TournamentNotFound.js';
import { tournamentCancelled } from '../events/tournamentEvents.js';

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

    const participants = await tournamentRepository.listParticipants(tournament.id);
    return tournamentRepository.update(tournament, {
      events: participants.length ? [tournamentCancelled(tournament, participants)] : [],
    });
  };
}
