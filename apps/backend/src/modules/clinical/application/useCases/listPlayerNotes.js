/** @param {{ noteRepository: import('../ports/NoteRepository.js').NoteRepository }} deps */
export function createListPlayerNotes({ noteRepository }) {
  /** @param {{ playerId: string }} input */
  return async function listPlayerNotes({ playerId }) {
    const notes = await noteRepository.listByPlayer(playerId);
    return { notes };
  };
}
