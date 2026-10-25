/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/OutboxRepository.js').OutboxRepository}
 */
export function createPrismaOutboxRepository(prisma) {
  return {
    async listPending(limit, maxAttempts) {
      return prisma.outboxEvent.findMany({
        where: { processedAt: null, attempts: { lt: maxAttempts } },
        orderBy: { occurredAt: 'asc' },
        take: limit,
      });
    },

    async markProcessed(id, at) {
      await prisma.outboxEvent.update({
        where: { id },
        data: { processedAt: at, lastError: null },
      });
    },

    async markFailed(id, { attempts, error }) {
      await prisma.outboxEvent.update({ where: { id }, data: { attempts, lastError: error } });
    },
  };
}
