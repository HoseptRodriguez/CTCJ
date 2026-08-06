import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * @param {{
 *   noteRepository: import('../ports/NoteRepository.js').NoteRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 * }} deps
 */
export function createCreateNote({ noteRepository, playerEligibilityProvider }) {
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

    return noteRepository.create({
      playerId,
      practitionerId: practitionerUserId,
      appointmentId,
      noteType,
      visibility,
      content,
    });
  };
}
