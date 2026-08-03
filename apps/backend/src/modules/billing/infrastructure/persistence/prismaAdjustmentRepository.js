function toRow(record) {
  return {
    id: record.id,
    membershipId: record.membershipId,
    adjustmentType: record.adjustmentType,
    value: record.value.toString(),
    reason: record.reason,
    validFrom: record.validFrom,
    validTo: record.validTo,
    authorizedBy: record.authorizedBy,
    createdAt: record.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/AdjustmentRepository.js').AdjustmentRepository}
 */
export function createPrismaAdjustmentRepository(prisma) {
  return {
    async create({
      membershipId,
      adjustmentType,
      value,
      reason,
      validFrom,
      validTo,
      authorizedBy,
    }) {
      const record = await prisma.membershipAdjustment.create({
        data: { membershipId, adjustmentType, value, reason, validFrom, validTo, authorizedBy },
      });
      return toRow(record);
    },

    async listByMembership(membershipId) {
      const records = await prisma.membershipAdjustment.findMany({
        where: { membershipId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toRow);
    },
  };
}
