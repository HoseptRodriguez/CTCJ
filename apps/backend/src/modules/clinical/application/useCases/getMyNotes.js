/** @param {{ noteRepository: import('../ports/NoteRepository.js').NoteRepository }} deps */
export function createGetMyNotes({ noteRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyNotes({ playerId }) {
    const notes = await noteRepository.listVisibleByPlayer(playerId);
    return { notes };
  };
}
