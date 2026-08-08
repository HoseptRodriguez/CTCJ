import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * @param {{
 *   coachNoteRepository: import('../ports/CoachNoteRepository.js').CoachNoteRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 * }} deps
 */
export function createCreateNote({ coachNoteRepository, playerEligibilityProvider }) {
  /**
   * @param {{ playerId: string, noteType: string, visibility: string, content: string,
   *   area?: string|null, coachUserId: string }} input
   */
  return async function createNote({
    playerId,
    noteType,
    visibility,
    content,
    area = null,
    coachUserId,
  }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(playerId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }

    return coachNoteRepository.create({
      playerId,
      coachId: coachUserId,
      noteType,
      visibility,
      content,
      area,
    });
  };
}
