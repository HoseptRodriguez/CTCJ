/**
 * @typedef {{ id: string, playerId: string, practitionerId: string, appointmentId: string|null,
 *   noteType: string, visibility: string, content: string, createdAt: Date }} ClinicalNoteRow
 */
export class NoteRepository {
  /** @returns {Promise<ClinicalNoteRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ClinicalNoteRow[]>} every note for this player, regardless of visibility, newest first */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ClinicalNoteRow[]>} only PLAYER_VISIBLE notes for this player, newest first */
  async listVisibleByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
