import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../errors/PractitionerNotEligible.js';

/**
 * @param {{
 *   noteRepository: import('../ports/NoteRepository.js').NoteRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   practitionerEligibilityProvider: import('../ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider,
 * }} deps
 */
export function createCreateNote({
  noteRepository,
  playerEligibilityProvider,
  practitionerEligibilityProvider,
}) {
  /**
   * @param {{ playerId: string, noteType: string, visibility: string, content: string,
   *   appointmentId?: string|null, practitionerUserId: string }} input
   */
  return async function createNote({
    playerId,
    noteType,
    visibility,
    content,
    appointmentId = null,
    practitionerUserId,
  }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }
    // Discipline is resolved server-side from the authoring practitioner's
    // real role, never client-supplied -- this is what enables the
    // discipline-siloed read side (listPlayerNotes) to work at all.
    const { eligible: isPractitionerEligible, discipline } =
      await practitionerEligibilityProvider.getPractitionerEligibility(practitionerUserId);
    if (!isPractitionerEligible) {
      throw new PractitionerNotEligible();
    }

    return noteRepository.create({
      playerId,
      practitionerId: practitionerUserId,
      discipline,
      appointmentId,
      noteType,
      visibility,
      content,
    });
  };
}
