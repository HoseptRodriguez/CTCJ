function toRow(record) {
  return {
    id: record.id,
    userId: record.userId,
    givenBy: record.givenBy,
    consentType: record.consentType,
    documentVersion: record.documentVersion,
    action: record.action,
    details: record.details,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    createdAt: record.createdAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ConsentRepository.js').ConsentRepository}
 */
export function createPrismaConsentRepository(prisma) {
  return {
    async append({
      userId,
      givenBy = null,
      consentType,
      documentVersion,
      action,
      details = null,
      ipAddress = null,
      userAgent = null,
    }) {
      const record = await prisma.consent.create({
        data: {
          userId,
          givenBy,
          consentType,
          documentVersion,
          action,
          details: details ?? undefined,
          ipAddress,
          userAgent,
        },
      });
      return toRow(record);
    },

    async listByUser(userId) {
      const records = await prisma.consent.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      return records.map(toRow);
    },

    async findLatest(userId, consentType) {
      const record = await prisma.consent.findFirst({
        where: { userId, consentType },
        orderBy: { createdAt: 'desc' },
      });
      return record ? toRow(record) : null;
    },
  };
}
