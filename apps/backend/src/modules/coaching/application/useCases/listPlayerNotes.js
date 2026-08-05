/**
 * Staff-facing: everything about this player, both PRIVATE and
 * PLAYER_VISIBLE -- used on the staff lookup page (ADMINISTRADOR/ENTRENADOR
 * only, gated at the HTTP layer, not here).
 * @param {{ coachNoteRepository: import('../ports/CoachNoteRepository.js').CoachNoteRepository }} deps
 */
export function createListPlayerNotes({ coachNoteRepository }) {
  /** @param {{ playerId: string }} input */
  return async function listPlayerNotes({ playerId }) {
    return coachNoteRepository.listByPlayer(playerId);
  };
}
