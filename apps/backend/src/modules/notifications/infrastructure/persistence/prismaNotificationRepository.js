function toRow(record) {
  return {
    id: record.id,
    recipientId: record.recipientId,
    type: record.type,
    title: record.title,
    body: record.body,
    linkPath: record.linkPath,
    readAt: record.readAt,
    createdAt: record.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/NotificationRepository.js').NotificationRepository}
 */
export function createPrismaNotificationRepository(prisma) {
  return {
    async create({ id, recipientId, type, title, body, linkPath }) {
      const record = await prisma.notification.create({
        data: { id, recipientId, type, title, body, linkPath },
      });
      return toRow(record);
    },

    async findById(id) {
      const record = await prisma.notification.findUnique({ where: { id } });
      return record ? toRow(record) : null;
    },

    async listByRecipient(recipientId, limit) {
      const records = await prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return records.map(toRow);
    },

    async countUnreadByRecipient(recipientId) {
      return prisma.notification.count({ where: { recipientId, readAt: null } });
    },

    async markRead(id, now) {
      const record = await prisma.notification.update({
        where: { id },
        data: { readAt: now },
      });
      return toRow(record);
    },

    async markAllRead(recipientId, now) {
      await prisma.notification.updateMany({
        where: { recipientId, readAt: null },
        data: { readAt: now },
      });
    },
  };
}
