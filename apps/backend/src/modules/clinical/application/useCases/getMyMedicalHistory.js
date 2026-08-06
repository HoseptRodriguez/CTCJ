/**
 * Self-service: the caller's own PLAYER_VISIBLE medical history entries,
 * scoped server-side to playerId (never client-supplied), matching
 * getMyNotes' exact precedent.
 *
 * @param {{ medicalHistoryRepository: import('../ports/MedicalHistoryRepository.js').MedicalHistoryRepository }} deps
 */
export function createGetMyMedicalHistory({ medicalHistoryRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyMedicalHistory({ playerId }) {
    const entries = await medicalHistoryRepository.listVisibleByPlayer(playerId);
    return { entries };
  };
}
