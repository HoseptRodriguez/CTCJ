function toRow(record) {
  return {
    id: record.id,
    userId: record.userId,
    status: record.status,
    requestedAt: record.requestedAt,
    decidedAt: record.decidedAt,
    decidedBy: record.decidedBy,
    notes: record.notes,
    decisionNotes: record.decisionNotes,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/AffiliationRequestRepository.js').AffiliationRequestRepository}
 */
export function createPrismaAffiliationRequestRepository(prisma) {
  return {
    async create({ userId, notes }) {
      const record = await prisma.affiliationRequest.create({ data: { userId, notes } });
      return toRow(record);
    },

    async findById(id) {
      const record = await prisma.affiliationRequest.findUnique({ where: { id } });
      return record ? toRow(record) : null;
    },

    async findPendingForUser(userId) {
      const record = await prisma.affiliationRequest.findFirst({
        where: { userId, status: 'PENDING' },
      });
      return record ? toRow(record) : null;
    },

    async listByUser(userId) {
      const records = await prisma.affiliationRequest.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listByStatus(status) {
      const records = await prisma.affiliationRequest.findMany({
        where: { status },
        orderBy: { requestedAt: 'asc' },
      });
      return records.map(toRow);
    },

    async decide(id, status, decidedAt, decidedBy, decisionNotes) {
      const record = await prisma.affiliationRequest.update({
        where: { id },
        data: { status, decidedAt, decidedBy, decisionNotes },
      });
      return toRow(record);
    },
  };
}
