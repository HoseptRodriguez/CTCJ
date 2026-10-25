/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/EmailDeliveryRepository.js').EmailDeliveryRepository}
 */
export function createPrismaEmailDeliveryRepository(prisma) {
  return {
    async enqueueMany(rows) {
      if (rows.length === 0) return 0;
      const { count } = await prisma.emailDelivery.createMany({ data: rows });
      return count;
    },

    async existsForSource(sourceType, sourceId, toEmail) {
      if (!sourceId) return false;
      const row = await prisma.emailDelivery.findFirst({
        where: { sourceType, sourceId, toEmail },
        select: { id: true },
      });
      return row != null;
    },

    async listDue(now, limit) {
      // Service first (they matter more than offers when the quota is short).
      return prisma.emailDelivery.findMany({
        where: { status: 'QUEUED', notBefore: { lte: now } },
        orderBy: [{ kind: 'desc' }, { createdAt: 'asc' }],
        take: limit,
      });
    },

    async countDue(now) {
      return prisma.emailDelivery.count({ where: { status: 'QUEUED', notBefore: { lte: now } } });
    },

    async countSentSince(since) {
      // Digest items aren't separate emails: they carry no provider id.
      return prisma.emailDelivery.count({
        where: { sentAt: { gte: since }, status: 'SENT', NOT: { providerMessageId: null } },
      });
    },

    async markSent(id, { providerMessageId, sentAt }) {
      await prisma.emailDelivery.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt,
          providerMessageId: providerMessageId ?? `local-${id}`,
          lastError: null,
          deferredReason: null,
        },
      });
    },

    async markAttemptFailed(id, { error, attempts, failed, retryAt }) {
      await prisma.emailDelivery.update({
        where: { id },
        data: {
          attempts,
          lastError: error,
          status: failed ? 'FAILED' : 'QUEUED',
          notBefore: failed ? undefined : retryAt,
        },
      });
    },

    async reschedule(ids, { notBefore, reason }) {
      await prisma.emailDelivery.updateMany({
        where: { id: { in: ids }, status: 'QUEUED' },
        data: { notBefore, deferredReason: reason },
      });
    },

    async markOpened(providerMessageId, openedAt) {
      await prisma.emailDelivery.updateMany({
        where: { providerMessageId, openedAt: null },
        data: { openedAt },
      });
    },

    async listDigestItems() {
      return prisma.emailDelivery.findMany({
        where: { status: 'DIGEST' },
        orderBy: { createdAt: 'asc' },
      });
    },

    async markIncludedInDigest(ids, at) {
      await prisma.emailDelivery.updateMany({
        where: { id: { in: ids }, status: 'DIGEST' },
        data: { status: 'SENT', sentAt: at },
      });
    },

    async statsBySource(sourceType, sourceIds) {
      const map = new Map();
      if (sourceIds.length === 0) return map;
      const rows = await prisma.emailDelivery.groupBy({
        by: ['sourceId', 'status'],
        where: { sourceType, sourceId: { in: sourceIds } },
        _count: { _all: true },
      });
      const opened = await prisma.emailDelivery.groupBy({
        by: ['sourceId'],
        where: { sourceType, sourceId: { in: sourceIds }, openedAt: { not: null } },
        _count: { _all: true },
      });
      for (const id of sourceIds) map.set(id, { queued: 0, sent: 0, failed: 0, opened: 0 });
      for (const r of rows) {
        const s = map.get(r.sourceId);
        if (r.status === 'SENT') s.sent += r._count._all;
        else if (r.status === 'FAILED') s.failed += r._count._all;
        else if (r.status === 'QUEUED' || r.status === 'DIGEST') s.queued += r._count._all;
      }
      for (const r of opened) map.get(r.sourceId).opened = r._count._all;
      return map;
    },

    async quotaDeferredCount() {
      return prisma.emailDelivery.count({ where: { status: 'QUEUED', deferredReason: 'QUOTA' } });
    },
  };
}
