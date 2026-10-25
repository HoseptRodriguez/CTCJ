/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ConsentRepository.js').ConsentRepository}
 */
export function createPrismaConsentRepository(prisma) {
  const toRow = (r) => r && { id: r.id, grantedAt: r.grantedAt, revokedAt: r.revokedAt };
  return {
    async findActive(playerId, scope) {
      return toRow(
        await prisma.clinicalAccessConsent.findFirst({
          where: { playerId, scope, revokedAt: null },
        }),
      );
    },

    async findLatest(playerId, scope) {
      return toRow(
        await prisma.clinicalAccessConsent.findFirst({
          where: { playerId, scope },
          orderBy: { grantedAt: 'desc' },
        }),
      );
    },

    async grant(playerId, scope, now) {
      return toRow(
        await prisma.clinicalAccessConsent.create({ data: { playerId, scope, grantedAt: now } }),
      );
    },

    async revoke(playerId, scope, now) {
      const { count } = await prisma.clinicalAccessConsent.updateMany({
        where: { playerId, scope, revokedAt: null },
        data: { revokedAt: now },
      });
      return count > 0;
    },
  };
}
