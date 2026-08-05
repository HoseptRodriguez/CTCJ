/**
 * @typedef {{ id: string, playerId: string, coachId: string, noteType: string, visibility: string, content: string, createdAt: Date }} CoachNoteRow
 */

export class CoachNoteRepository {
  /** @returns {Promise<CoachNoteRow>} */
  async create(_input) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CoachNoteRow[]>} every note for this player, regardless of visibility, newest first */
  async listByPlayer(_playerId) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<CoachNoteRow[]>} only PLAYER_VISIBLE notes for this player, newest first */
  async listVisibleByPlayer(_playerId) {
    throw new Error('Not implemented');
  }
}
