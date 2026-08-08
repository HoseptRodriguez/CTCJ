import { randomUUID } from 'node:crypto';

import { CompetitionSeason } from '../../../../src/modules/competition/domain/entities/CompetitionSeason.js';
import { CompetitionMatch } from '../../../../src/modules/competition/domain/entities/CompetitionMatch.js';

// Fakes return real domain-entity instances (not plain data objects) so that
// use cases can call .close()/.voidOut()/.assertOpen() on what findById()
// returns, exactly like the real Prisma repositories' toDomain() does.

export function createFakeSeasonRepository() {
  const byId = new Map();

  return {
    async create(season) {
      byId.set(season.id, new CompetitionSeason(season));
      return new CompetitionSeason(season);
    },
    async findById(id) {
      const season = byId.get(id);
      return season ? new CompetitionSeason(season) : null;
    },
    async findOpenByClub(clubId) {
      const found = [...byId.values()].find((s) => s.clubId === clubId && s.status === 'OPEN');
      return found ? new CompetitionSeason(found) : null;
    },
    async listByClub(clubId) {
      return [...byId.values()]
        .filter((s) => s.clubId === clubId)
        .sort((a, b) => b.year - a.year || b.seasonNumber - a.seasonNumber)
        .map((s) => new CompetitionSeason(s));
    },
    async update(season) {
      byId.set(season.id, new CompetitionSeason(season));
      return new CompetitionSeason(season);
    },
    // Test-only: seed a season row directly, bypassing create().
    _seed(season) {
      byId.set(season.id, new CompetitionSeason(season));
    },
  };
}

export function createFakeCompetitionMatchRepository() {
  const byId = new Map();

  return {
    async create(match) {
      const stored = new CompetitionMatch({
        ...match,
        participantsA: [...match.participantsA],
        participantsB: [...match.participantsB],
        createdAt: match.createdAt ?? new Date(),
      });
      byId.set(stored.id, stored);
      return new CompetitionMatch(stored);
    },
    async findById(id) {
      const match = byId.get(id);
      return match ? new CompetitionMatch(match) : null;
    },
    async update(match) {
      byId.set(match.id, new CompetitionMatch(match));
      return new CompetitionMatch(match);
    },
    async list({ seasonId, category, modality, playerId, includeVoid = false }) {
      return [...byId.values()]
        .filter(
          (m) => m.seasonId === seasonId && m.category === category && m.modality === modality,
        )
        .filter((m) => includeVoid || m.status !== 'VOID')
        .filter(
          (m) =>
            !playerId || m.participantsA.includes(playerId) || m.participantsB.includes(playerId),
        )
        .sort((a, b) => b.playedAt - a.playedAt)
        .map((m) => new CompetitionMatch(m));
    },
    async listByPlayer(seasonId, playerId) {
      return [...byId.values()]
        .filter((m) => m.seasonId === seasonId && m.status !== 'VOID')
        .filter((m) => m.participantsA.includes(playerId) || m.participantsB.includes(playerId))
        .sort((a, b) => b.playedAt - a.playedAt)
        .map((m) => new CompetitionMatch(m));
    },
    // Test-only: seed a match row directly, bypassing create().
    _seed(match) {
      const id = match.id ?? randomUUID();
      byId.set(
        id,
        new CompetitionMatch({
          status: 'RECORDED',
          notes: null,
          voidedAt: null,
          voidedBy: null,
          voidReason: null,
          ...match,
          id,
        }),
      );
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

/** @param {Map<string, {firstName: string, lastName: string, email: string}>} summariesById */
export function createFakePlayerDirectoryProvider(summariesById = new Map()) {
  return {
    async getPlayerSummaries(userIds) {
      const result = new Map();
      for (const id of userIds) {
        if (summariesById.has(id)) {
          result.set(id, summariesById.get(id));
        }
      }
      return result;
    },
  };
}

/** @param {Date} now */
export function createFakeClock(now = new Date('2026-01-01T00:00:00.000Z')) {
  return { now: () => now };
}
