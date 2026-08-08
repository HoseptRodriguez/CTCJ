function toRow(record) {
  return {
    id: record.id,
    playerId: record.playerId,
    coachId: record.coachId,
    area: record.area,
    rating: record.rating,
    recordedAt: record.recordedAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PerformanceRatingRepository.js').PerformanceRatingRepository}
 */
export function createPrismaPerformanceRatingRepository(prisma) {
  return {
    async createBatch({ playerId, coachId, ratings }) {
      // One $transaction, not N round-trips -- Postgres's CURRENT_TIMESTAMP
      // is transaction-time-stable, so every row created here shares the
      // same recorded_at for free, with no timestamp manufactured here.
      const operations = Object.entries(ratings).map(([area, rating]) =>
        prisma.performanceRating.create({ data: { playerId, coachId, area, rating } }),
      );
      const records = await prisma.$transaction(operations);
      return records.map(toRow);
    },

    async listByPlayer(playerId) {
      const records = await prisma.performanceRating.findMany({
        where: { playerId },
        orderBy: { recordedAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listRecent(limit) {
      const records = await prisma.performanceRating.findMany({
        orderBy: { recordedAt: 'desc' },
        take: limit,
      });
      return records.map(toRow);
    },
  };
}
