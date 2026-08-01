/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/EmailVerificationRepository.js').EmailVerificationRepository}
 */
export function createPrismaEmailVerificationRepository(prisma) {
  return {
    async create(userId, tokenHash, expiresAt) {
      const row = await prisma.emailVerification.create({
        data: { userId, tokenHash, expiresAt },
      });
      return { id: row.id };
    },

    async findByHash(tokenHash) {
      const row = await prisma.emailVerification.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt,
      };
    },

    async markConsumed(id) {
      await prisma.emailVerification.update({
        where: { id },
        data: { consumedAt: new Date() },
      });
    },
  };
}
