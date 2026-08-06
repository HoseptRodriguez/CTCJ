/**
 * @typedef {{ id: string, playerId: string, practitionerId: string, discipline: string,
 *   appointmentId: string|null, noteType: string, visibility: string, content: string,
 *   createdAt: Date }} ClinicalNoteRow
 */
export class NoteRepository {
  /** @returns {Promise<ClinicalNoteRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @param {string} playerId @param {{ discipline: string }} filter
   * @returns {Promise<ClinicalNoteRow[]>} every note for this player within
   * the given discipline, regardless of visibility, newest first --
   * discipline-siloed: a Psicologo never sees Physiotherapy notes and
   * vice versa. */
  async listByPlayer(_playerId, _filter) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<ClinicalNoteRow[]>} only PLAYER_VISIBLE notes for this player, newest first */
  async listVisibleByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
