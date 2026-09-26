/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/FitnessStatusRepository.js').FitnessStatusRepository}
 */
export function createPrismaFitnessStatusRepository(prisma) {
  const toRow = (r) => r && { status: r.status, unfitUntil: r.unfitUntil, createdAt: r.createdAt };
  return {
    async findCurrent(playerId) {
      return toRow(
        await prisma.physioFitnessStatus.findFirst({
          where: { playerId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    },

    async record({ playerId, practitionerId, status, unfitUntil }) {
      return toRow(
        await prisma.physioFitnessStatus.create({
          data: { playerId, practitionerId, status, unfitUntil },
        }),
      );
    },
  };
}
