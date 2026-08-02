/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/SystemSettingRepository.js').SystemSettingRepository}
 */
export function createPrismaSystemSettingRepository(prisma) {
  return {
    async findByKey(clubId, key) {
      const row = await prisma.systemSetting.findUnique({
        where: { clubId_key: { clubId, key } },
      });
      if (!row) return null;
      return { value: row.value, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
    },

    async set(clubId, key, value, updatedByUserId) {
      await prisma.systemSetting.upsert({
        where: { clubId_key: { clubId, key } },
        create: { clubId, key, value, updatedBy: updatedByUserId ?? null },
        update: { value, updatedBy: updatedByUserId ?? null },
      });
    },
  };
}
