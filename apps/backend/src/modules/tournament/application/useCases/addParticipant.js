import { TournamentNotFound } from '../errors/TournamentNotFound.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PlayerAlreadyRegistered } from '../errors/PlayerAlreadyRegistered.js';
import { ParticipantCountMismatch } from '../errors/ParticipantCountMismatch.js';

const MEMBERS_PER_ENTRY = Object.freeze({ SINGLES: 1, DOBLES: 2 });

/**
 * @param {{
 *   tournamentRepository: import('../ports/TournamentRepository.js').TournamentRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 * }} deps
 */
export function createAddParticipant({ tournamentRepository, playerEligibilityProvider }) {
  /** @param {{ tournamentId: string, playerIds: string[], registeredByUserId: string }} input */
  return async function addParticipant({ tournamentId, playerIds, registeredByUserId }) {
    const tournament = await tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new TournamentNotFound();
    }
    tournament.assertDraft('addParticipant');

    const expectedMembers = MEMBERS_PER_ENTRY[tournament.modality];
    if (playerIds.length !== expectedMembers) {
      throw new ParticipantCountMismatch(tournament.modality, playerIds.length);
    }

    const eligibility = await Promise.all(
      playerIds.map((id) => playerEligibilityProvider.isEligiblePlayer(id)),
    );
    if (eligibility.some((eligible) => !eligible)) {
      throw new PlayerNotEligible();
    }

    const existing = await tournamentRepository.listParticipants(tournamentId);
    const alreadyRegisteredIds = new Set(existing.flatMap((p) => p.playerIds));
    if (playerIds.some((id) => alreadyRegisteredIds.has(id))) {
      throw new PlayerAlreadyRegistered();
    }

    return tournamentRepository.addParticipant({
      tournamentId,
      playerIds,
      registeredBy: registeredByUserId,
    });
  };
}
