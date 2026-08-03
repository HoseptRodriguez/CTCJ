function toRow(record) {
  return {
    id: record.id,
    guardianUserId: record.guardianUserId,
    minorUserId: record.minorUserId,
    canPay: record.canPay,
    canBook: record.canBook,
    status: record.status,
    requestedAt: record.requestedAt,
    decidedAt: record.decidedAt,
    decidedBy: record.decidedBy,
    decisionNotes: record.decisionNotes,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/GuardianshipRepository.js').GuardianshipRepository}
 */
export function createPrismaGuardianshipRepository(prisma) {
  return {
    async create({ guardianUserId, minorUserId, canPay, canBook }) {
      const record = await prisma.guardianship.create({
        data: { guardianUserId, minorUserId, canPay, canBook },
      });
      return toRow(record);
    },

    async findById(id) {
      const record = await prisma.guardianship.findUnique({ where: { id } });
      return record ? toRow(record) : null;
    },

    async findActiveForPair(guardianUserId, minorUserId) {
      const record = await prisma.guardianship.findFirst({
        where: { guardianUserId, minorUserId, status: { in: ['PENDING', 'APPROVED'] } },
      });
      return record ? toRow(record) : null;
    },

    async existsApprovedBookable(guardianUserId, minorUserId) {
      const record = await prisma.guardianship.findFirst({
        where: { guardianUserId, minorUserId, status: 'APPROVED', canBook: true },
        select: { id: true },
      });
      return record != null;
    },

    async listByGuardian(guardianUserId) {
      const records = await prisma.guardianship.findMany({
        where: { guardianUserId },
        orderBy: { requestedAt: 'desc' },
      });
      return records.map(toRow);
    },

    async listByStatus(status) {
      const records = await prisma.guardianship.findMany({
        where: { status },
        orderBy: { requestedAt: 'asc' },
      });
      return records.map(toRow);
    },

    async decide(id, status, decidedAt, decidedBy, decisionNotes) {
      const record = await prisma.guardianship.update({
        where: { id },
        data: { status, decidedAt, decidedBy, decisionNotes },
      });
      return toRow(record);
    },
  };
}
