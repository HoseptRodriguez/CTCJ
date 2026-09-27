function toCourtSummary(row) {
  return {
    id: row.id,
    name: row.name,
    surface: row.surface,
    hasLighting: row.hasLighting,
    priceCop: row.defaultPriceCop,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/CourtRepository.js').CourtRepository}
 */
export function createPrismaCourtRepository(prisma) {
  return {
    async listActive(clubId) {
      const rows = await prisma.court.findMany({
        where: { clubId, isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
      return rows.map(toCourtSummary);
    },

    async findActiveById(clubId, courtId) {
      const row = await prisma.court.findFirst({
        where: { id: courtId, clubId, isActive: true },
      });
      return row ? toCourtSummary(row) : null;
    },

    async setPrice(clubId, courtId, priceCop, changedBy) {
      return prisma.$transaction(async (tx) => {
        const before = await tx.court.findFirst({
          where: { id: courtId, clubId, isActive: true },
        });
        if (!before) return null;
        const row = await tx.court.update({
          where: { id: courtId },
          data: { defaultPriceCop: BigInt(priceCop) },
        });
        await tx.courtPriceHistory.create({
          data: {
            courtId,
            previousPriceCop: before.defaultPriceCop,
            newPriceCop: BigInt(priceCop),
            changedBy,
          },
        });
        return { court: toCourtSummary(row), previousPriceCop: before.defaultPriceCop };
      });
    },

    async listPriceHistory(courtId) {
      const rows = await prisma.courtPriceHistory.findMany({
        where: { courtId },
        orderBy: { changedAt: 'desc' },
      });
      return rows.map((r) => ({
        id: r.id,
        previousPriceCop: r.previousPriceCop,
        newPriceCop: r.newPriceCop,
        changedBy: r.changedBy,
        changedAt: r.changedAt,
      }));
    },
  };
}
