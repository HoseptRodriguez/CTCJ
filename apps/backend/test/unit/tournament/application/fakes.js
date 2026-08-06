import { randomUUID } from 'node:crypto';

import { Tournament } from '../../../../src/modules/tournament/domain/entities/Tournament.js';

// Fakes return real Tournament instances (not plain data objects) so use
// cases can call .generateDraw()/.complete()/.cancel()/.assertDraft() on
// what findById() returns, exactly like the real Prisma repository's
// toDomain() would.

export function createFakeTournamentRepository() {
  const tournaments = new Map();
  const participants = new Map();
  const matches = new Map();

  return {
    async create(tournament) {
      tournaments.set(tournament.id, new Tournament(tournament));
      return new Tournament(tournament);
    },
    async findById(id) {
      const data = tournaments.get(id);
      return data ? new Tournament(data) : null;
    },
    async update(tournament) {
      tournaments.set(tournament.id, new Tournament(tournament));
      return new Tournament(tournament);
    },
    async listByClub(clubId) {
      return [...tournaments.values()]
        .filter((t) => t.clubId === clubId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((t) => new Tournament(t));
    },

    async addParticipant({ tournamentId, playerIds, registeredBy }) {
      const id = randomUUID();
      const row = {
        id,
        tournamentId,
        playerIds: [...playerIds],
        seed: null,
        registeredBy,
        registeredAt: new Date(),
      };
      participants.set(id, row);
      return { ...row };
    },
    async removeParticipant(participantId) {
      participants.delete(participantId);
    },
    async listParticipants(tournamentId) {
      return [...participants.values()]
        .filter((p) => p.tournamentId === tournamentId)
        .map((p) => ({ ...p }));
    },

    async saveBracket({ tournament, seeds, matches: newMatches }) {
      for (const { participantId, seed } of seeds) {
        const p = participants.get(participantId);
        if (p) p.seed = seed;
      }
      for (const m of newMatches) {
        const id = randomUUID();
        matches.set(id, { id, tournamentId: tournament.id, notes: null, ...m });
      }
      tournaments.set(tournament.id, new Tournament(tournament));
      return new Tournament(tournament);
    },

    async findMatchById(matchId) {
      const m = matches.get(matchId);
      return m ? { ...m } : null;
    },
    async listMatches(tournamentId) {
      return [...matches.values()]
        .filter((m) => m.tournamentId === tournamentId)
        .sort((a, b) => a.round - b.round || a.slot - b.slot)
        .map((m) => ({ ...m }));
    },
    async saveMatchResult({
      matchId,
      setsWonA,
      setsWonB,
      winnerParticipantId,
      recordedBy,
      playedAt,
      notes,
      propagateTo,
      tournament,
    }) {
      const match = matches.get(matchId);
      match.setsWonA = setsWonA;
      match.setsWonB = setsWonB;
      match.winnerParticipantId = winnerParticipantId;
      match.recordedBy = recordedBy;
      match.playedAt = playedAt;
      match.notes = notes ?? null;
      if (propagateTo) {
        const next = matches.get(propagateTo.matchId);
        if (propagateTo.side === 'A') next.participantAId = winnerParticipantId;
        else next.participantBId = winnerParticipantId;
      }
      if (tournament) {
        tournaments.set(tournament.id, new Tournament(tournament));
      }
      return { ...match };
    },

    // Test-only seeding helpers, bypassing the normal creation flow.
    _seedTournament(data) {
      tournaments.set(data.id, new Tournament(data));
    },
    _seedParticipant(data) {
      const id = data.id ?? randomUUID();
      participants.set(id, { id, seed: null, registeredAt: new Date(), ...data });
    },
    _seedMatch(data) {
      const id = data.id ?? randomUUID();
      matches.set(id, {
        id,
        participantAId: null,
        participantBId: null,
        setsWonA: null,
        setsWonB: null,
        winnerParticipantId: null,
        playedAt: null,
        recordedBy: null,
        notes: null,
        ...data,
      });
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
        if (summariesById.has(id)) result.set(id, summariesById.get(id));
      }
      return result;
    },
  };
}

/** @param {Array<{playerId: string, points: number}>} rows */
export function createFakeStandingsProvider(rows = []) {
  return {
    async getCurrentStandings() {
      return rows;
    },
  };
}

/** @param {Date} now */
export function createFakeClock(now = new Date('2026-01-01T00:00:00.000Z')) {
  return { now: () => now };
}
