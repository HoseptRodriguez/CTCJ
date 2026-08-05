import { randomUUID } from 'node:crypto';

export function createFakeCoachNoteRepository() {
  const byId = new Map();

  return {
    async create({ playerId, coachId, noteType, visibility, content }) {
      const id = randomUUID();
      const note = { id, playerId, coachId, noteType, visibility, content, createdAt: new Date() };
      byId.set(id, note);
      return note;
    },
    async listByPlayer(playerId) {
      return Array.from(byId.values())
        .filter((note) => note.playerId === playerId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async listVisibleByPlayer(playerId) {
      return Array.from(byId.values())
        .filter((note) => note.playerId === playerId && note.visibility === 'PLAYER_VISIBLE')
        .sort((a, b) => b.createdAt - a.createdAt);
    },
  };
}

/** @param {Set<string>} eligiblePlayerIds */
export function createFakePlayerEligibilityProvider(eligiblePlayerIds = new Set()) {
  return {
    async isEligiblePlayer(userId) {
      return eligiblePlayerIds.has(userId);
    },
  };
}
