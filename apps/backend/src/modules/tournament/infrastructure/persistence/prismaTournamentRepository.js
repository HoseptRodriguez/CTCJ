import { Tournament } from '../../domain/entities/Tournament.js';

function toDomain(record) {
  return new Tournament({
    id: record.id,
    clubId: record.clubId,
    name: record.name,
    category: record.category,
    modality: record.modality,
    status: record.status,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    drawGeneratedAt: record.drawGeneratedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    championId: record.championId,
  });
}

function toParticipantRow(record) {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    playerIds: record.members.map((m) => m.playerId),
    seed: record.seed,
    registeredAt: record.registeredAt,
  };
}

function toMatchRow(record) {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    round: record.round,
    slot: record.slot,
    participantAId: record.participantAId,
    participantBId: record.participantBId,
    setsWonA: record.setsWonA,
    setsWonB: record.setsWonB,
    winnerParticipantId: record.winnerParticipantId,
    playedAt: record.playedAt,
    recordedBy: record.recordedBy,
    notes: record.notes,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/TournamentRepository.js').TournamentRepository}
 */
export function createPrismaTournamentRepository(prisma) {
  return {
    async create(tournament) {
      const record = await prisma.tournament.create({
        data: {
          id: tournament.id,
          clubId: tournament.clubId,
          name: tournament.name,
          category: tournament.category,
          modality: tournament.modality,
          status: tournament.status,
          createdBy: tournament.createdBy,
        },
      });
      return toDomain(record);
    },

    async findById(id) {
      const record = await prisma.tournament.findUnique({ where: { id } });
      return record ? toDomain(record) : null;
    },

    async update(tournament) {
      const record = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          status: tournament.status,
          drawGeneratedAt: tournament.drawGeneratedAt,
          completedAt: tournament.completedAt,
          cancelledAt: tournament.cancelledAt,
          championId: tournament.championId,
        },
      });
      return toDomain(record);
    },

    async listByClub(clubId) {
      const records = await prisma.tournament.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toDomain);
    },

    async addParticipant({ tournamentId, playerIds, registeredBy }) {
      const record = await prisma.tournamentParticipant.create({
        data: {
          tournamentId,
          registeredBy,
          members: { create: playerIds.map((playerId) => ({ playerId })) },
        },
        include: { members: true },
      });
      return toParticipantRow(record);
    },

    async removeParticipant(participantId) {
      await prisma.tournamentParticipant.delete({ where: { id: participantId } });
    },

    async listParticipants(tournamentId) {
      const records = await prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: { members: true },
      });
      return records.map(toParticipantRow);
    },

    async saveBracket({ tournament, seeds, matches }) {
      // One transaction: every participant's seed, every round's match
      // rows (byes pre-resolved), and the tournament's DRAFT->
      // DRAW_GENERATED transition, all committed together.
      await prisma.$transaction([
        ...seeds.map(({ participantId, seed }) =>
          prisma.tournamentParticipant.update({ where: { id: participantId }, data: { seed } }),
        ),
        ...matches.map((m) =>
          prisma.tournamentMatch.create({
            data: {
              tournamentId: tournament.id,
              round: m.round,
              slot: m.slot,
              participantAId: m.participantAId,
              participantBId: m.participantBId,
              winnerParticipantId: m.winnerParticipantId,
            },
          }),
        ),
        prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: tournament.status, drawGeneratedAt: tournament.drawGeneratedAt },
        }),
      ]);
      return tournament;
    },

    async findMatchById(matchId) {
      const record = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
      return record ? toMatchRow(record) : null;
    },

    async listMatches(tournamentId) {
      const records = await prisma.tournamentMatch.findMany({
        where: { tournamentId },
        orderBy: [{ round: 'asc' }, { slot: 'asc' }],
      });
      return records.map(toMatchRow);
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
      const operations = [
        prisma.tournamentMatch.update({
          where: { id: matchId },
          data: { setsWonA, setsWonB, winnerParticipantId, recordedBy, playedAt, notes },
        }),
      ];
      if (propagateTo) {
        operations.push(
          prisma.tournamentMatch.update({
            where: { id: propagateTo.matchId },
            data:
              propagateTo.side === 'A'
                ? { participantAId: winnerParticipantId }
                : { participantBId: winnerParticipantId },
          }),
        );
      }
      if (tournament) {
        operations.push(
          prisma.tournament.update({
            where: { id: tournament.id },
            data: {
              status: tournament.status,
              completedAt: tournament.completedAt,
              championId: tournament.championId,
            },
          }),
        );
      }
      const [updatedMatch] = await prisma.$transaction(operations);
      return toMatchRow(updatedMatch);
    },
  };
}
