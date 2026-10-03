/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/NotificationPreferenceRepository.js').NotificationPreferenceRepository}
 */
export function createPrismaNotificationPreferenceRepository(prisma) {
  const pick = ({ category, channel, enabled }) => ({ category, channel, enabled });
  return {
    async listForUser(userId) {
      const rows = await prisma.notificationPreference.findMany({ where: { userId } });
      return rows.map(pick);
    },

    async listForUsers(userIds) {
      const map = new Map();
      if (userIds.length === 0) return map;
      const rows = await prisma.notificationPreference.findMany({
        where: { userId: { in: userIds } },
      });
      for (const row of rows) {
        if (!map.has(row.userId)) map.set(row.userId, []);
        map.get(row.userId).push(pick(row));
      }
      return map;
    },

    async upsertMany(userId, rows) {
      const now = new Date();
      await prisma.$transaction(
        rows.map(({ category, channel, enabled }) =>
          prisma.notificationPreference.upsert({
            where: { userId_category_channel: { userId, category, channel } },
            create: { userId, category, channel, enabled, updatedAt: now },
            update: { enabled, updatedAt: now },
          }),
        ),
      );
    },

    async getSettings(userId) {
      const row = await prisma.notificationSetting.findUnique({ where: { userId } });
      return { dailyDigest: row?.dailyDigest ?? false };
    },

    async digestUserIds(userIds) {
      if (userIds.length === 0) return new Set();
      const rows = await prisma.notificationSetting.findMany({
        where: { userId: { in: [...new Set(userIds)] }, dailyDigest: true },
        select: { userId: true },
      });
      return new Set(rows.map((r) => r.userId));
    },

    async setSettings(userId, { dailyDigest }) {
      await prisma.notificationSetting.upsert({
        where: { userId },
        create: { userId, dailyDigest },
        update: { dailyDigest, updatedAt: new Date() },
      });
    },
  };
}
