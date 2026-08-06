import { TournamentNotFound } from '../errors/TournamentNotFound.js';
import { ParticipantNotFound } from '../errors/ParticipantNotFound.js';

/**
 * @param {{ tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository }} deps
 */
export function createRemoveParticipant({ tournamentRepository }) {
  /** @param {{ tournamentId: string, participantId: string }} input */
  return async function removeParticipant({ tournamentId, participantId }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }
    tournament.assertDraft('removeParticipant');

    const participants = await tournamentRepository.listParticipants(tournamentId);
    if (!participants.some((p) => p.id === participantId)) {
      throw new ParticipantNotFound();
    }

    await tournamentRepository.removeParticipant(participantId);
  };
}
