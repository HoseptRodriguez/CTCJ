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

export function createFakePerformanceRatingRepository() {
  const rows = [];

  return {
    async createBatch({ playerId, coachId, ratings }) {
      // One shared timestamp per batch, mirroring the real repository's
      // transaction-time-stable CURRENT_TIMESTAMP behavior.
      const recordedAt = new Date();
      const created = Object.entries(ratings).map(([area, rating]) => ({
        id: randomUUID(),
        playerId,
        coachId,
        area,
        rating,
        recordedAt,
      }));
      rows.push(...created);
      return created;
    },
    async listByPlayer(playerId) {
      return rows
        .filter((row) => row.playerId === playerId)
        .sort((a, b) => b.recordedAt - a.recordedAt);
    },
    // Test-only: seed a row with a controlled timestamp, for ordering/progress
    // tests where relying on real wall-clock gaps between createBatch() calls
    // would be flaky.
    _seed(row) {
      rows.push({ id: randomUUID(), ...row });
    },
  };
}
