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
  };
}
