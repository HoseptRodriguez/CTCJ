/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PasswordResetRepository.js').PasswordResetRepository}
 */
export function createPrismaPasswordResetRepository(prisma) {
  return {
    async create(userId, tokenHash, expiresAt, requestedIp) {
      const row = await prisma.passwordReset.create({
        data: { userId, tokenHash, expiresAt, requestedIp },
      });
      return { id: row.id };
    },

    async findByHash(tokenHash) {
      const row = await prisma.passwordReset.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        expiresAt: row.expiresAt,
        consumedAt: row.consumedAt,
      };
    },

    async markConsumed(id) {
      await prisma.passwordReset.update({
        where: { id },
        data: { consumedAt: new Date() },
      });
    },
  };
}
