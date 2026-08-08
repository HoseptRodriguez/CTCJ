import { CompetitionMatch } from '../../domain/entities/CompetitionMatch.js';

function toDomain(record) {
  const participantsA = record.participants.filter((p) => p.side === 'A').map((p) => p.playerId);
  const participantsB = record.participants.filter((p) => p.side === 'B').map((p) => p.playerId);

  return new CompetitionMatch({
    id: record.id,
    seasonId: record.seasonId,
    category: record.category,
    modality: record.modality,
    status: record.status,
    winnerSide: record.winnerSide,
    setsWonA: record.setsWonA,
    setsWonB: record.setsWonB,
    participantsA,
    participantsB,
    playedAt: record.playedAt,
    notes: record.notes,
    recordedBy: record.recordedBy,
    createdAt: record.createdAt,
    voidedAt: record.voidedAt,
    voidedBy: record.voidedBy,
    voidReason: record.voidReason,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/CompetitionMatchRepository.js').CompetitionMatchRepository}
 */
export function createPrismaCompetitionMatchRepository(prisma) {
  return {
    async create(match) {
      // Nested create -- match row + every participant row are written in
      // one Prisma call, atomically, matching the plan's "one transaction"
      // requirement without a separate $transaction wrapper.
      const record = await prisma.competitionMatch.create({
        data: {
          id: match.id,
          seasonId: match.seasonId,
          category: match.category,
          modality: match.modality,
          status: match.status,
          winnerSide: match.winnerSide,
          setsWonA: match.setsWonA,
          setsWonB: match.setsWonB,
          playedAt: match.playedAt,
          notes: match.notes,
          recordedBy: match.recordedBy,
          participants: {
            create: [
              ...match.participantsA.map((playerId) => ({ playerId, side: 'A' })),
              ...match.participantsB.map((playerId) => ({ playerId, side: 'B' })),
            ],
          },
        },
        include: { participants: true },
      });
      return toDomain(record);
    },

    async findById(id) {
      const record = await prisma.competitionMatch.findUnique({
        where: { id },
        include: { participants: true },
      });
      return record ? toDomain(record) : null;
    },

    async update(match) {
      const record = await prisma.competitionMatch.update({
        where: { id: match.id },
        data: {
          status: match.status,
          voidedAt: match.voidedAt,
          voidedBy: match.voidedBy,
          voidReason: match.voidReason,
        },
        include: { participants: true },
      });
      return toDomain(record);
    },

    async list({ seasonId, category, modality, playerId, includeVoid = false }) {
      const records = await prisma.competitionMatch.findMany({
        where: {
          seasonId,
          category,
          modality,
          ...(includeVoid ? {} : { status: { not: 'VOID' } }),
          ...(playerId ? { participants: { some: { playerId } } } : {}),
        },
        include: { participants: true },
        orderBy: { playedAt: 'desc' },
      });
      return records.map(toDomain);
    },

    async listByPlayer(seasonId, playerId) {
      const records = await prisma.competitionMatch.findMany({
        where: {
          seasonId,
          status: { not: 'VOID' },
          participants: { some: { playerId } },
        },
        include: { participants: true },
        orderBy: { playedAt: 'desc' },
      });
      return records.map(toDomain);
    },
  };
}
