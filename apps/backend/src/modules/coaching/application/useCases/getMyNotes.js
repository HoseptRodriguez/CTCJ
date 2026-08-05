/**
 * Self-service: only this player's PLAYER_VISIBLE notes -- PRIVATE ones are
 * never returned here. `playerId` is scoped by the HTTP controller to
 * req.user.id, never client-supplied (mirrors billing's getMyInvoices.js
 * exactly).
 * @param {{ coachNoteRepository: import('../ports/CoachNoteRepository.js').CoachNoteRepository }} deps
 */
export function createGetMyNotes({ coachNoteRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyNotes({ playerId }) {
    return coachNoteRepository.listVisibleByPlayer(playerId);
  };
}
