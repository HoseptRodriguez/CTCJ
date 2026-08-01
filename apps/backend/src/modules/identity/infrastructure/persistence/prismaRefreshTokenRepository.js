/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/RefreshTokenRepository.js').RefreshTokenRepository}
 */
export function createPrismaRefreshTokenRepository(prisma) {
  return {
    async create(userId, tokenHash, familyId, expiresAt, ipAddress, userAgent) {
      const row = await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          familyId,
          expiresAt,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
      return { id: row.id, familyId: row.familyId, expiresAt: row.expiresAt };
    },

    async findByHash(tokenHash) {
      const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        familyId: row.familyId,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        replacedBy: row.replacedBy,
      };
    },

    async rotate(oldTokenId, newTokenHash, expiresAt, ipAddress, userAgent) {
      const old = await prisma.refreshToken.findUniqueOrThrow({ where: { id: oldTokenId } });
      return prisma.$transaction(async (tx) => {
        const newRow = await tx.refreshToken.create({
          data: {
            userId: old.userId,
            tokenHash: newTokenHash,
            familyId: old.familyId,
            expiresAt,
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
          },
        });
        await tx.refreshToken.update({
          where: { id: old.id },
          data: { replacedBy: newRow.id },
        });
        return { id: newRow.id };
      });
    },

    async revokeFamily(familyId) {
      await prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },

    async revokeById(tokenId) {
      await prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      });
    },

    async revokeAllForUser(userId) {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  };
}
