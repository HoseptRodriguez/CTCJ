/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/MfaRepository.js').MfaRepository}
 */
export function createPrismaMfaRepository(prisma) {
  const clearState = {
    mfaEnabled: false,
    mfaSecret: null,
    mfaEnabledAt: null,
    mfaFailedCount: null,
    mfaLockedUntil: null,
    mfaLastStep: null,
  };

  return {
    async getState(userId) {
      const [row, left] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            mfaEnabled: true,
            mfaSecret: true,
            mfaEnabledAt: true,
            mfaFailedCount: true,
            mfaLockedUntil: true,
            mfaLastStep: true,
          },
        }),
        prisma.mfaRecoveryCode.count({ where: { userId, usedAt: null } }),
      ]);
      return {
        enabled: Boolean(row?.mfaEnabled && row?.mfaSecret),
        secret: row?.mfaSecret ?? null,
        enabledAt: row?.mfaEnabledAt ?? null,
        failedCount: row?.mfaFailedCount ?? 0,
        lockedUntil: row?.mfaLockedUntil ?? null,
        lastStep: row?.mfaLastStep == null ? null : Number(row.mfaLastStep),
        recoveryCodesLeft: left,
      };
    },

    async savePendingSecret(userId, encryptedSecret) {
      await prisma.user.update({
        where: { id: userId },
        data: { ...clearState, mfaSecret: encryptedSecret },
      });
    },

    async enable(userId, { now, lastStep, recoveryCodeHashes }) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaEnabledAt: now,
            mfaFailedCount: null,
            mfaLockedUntil: null,
            mfaLastStep: BigInt(lastStep),
          },
        }),
        prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
        prisma.mfaRecoveryCode.createMany({
          data: recoveryCodeHashes.map((codeHash) => ({ userId, codeHash })),
        }),
      ]);
    },

    async disable(userId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: clearState }),
        prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      ]);
    },

    async recordFailure(userId, { failedCount, lockedUntil }) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaFailedCount: failedCount, mfaLockedUntil: lockedUntil },
      });
    },

    async recordSuccess(userId, { lastStep }) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaFailedCount: null,
          mfaLockedUntil: null,
          ...(lastStep == null ? {} : { mfaLastStep: BigInt(lastStep) }),
        },
      });
    },

    async replaceRecoveryCodes(userId, hashes) {
      await prisma.$transaction([
        prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
        prisma.mfaRecoveryCode.createMany({
          data: hashes.map((codeHash) => ({ userId, codeHash })),
        }),
      ]);
    },

    async useRecoveryCode(userId, hash, now) {
      const { count } = await prisma.mfaRecoveryCode.updateMany({
        where: { userId, codeHash: hash, usedAt: null },
        data: { usedAt: now },
      });
      return count === 1;
    },
  };
}
