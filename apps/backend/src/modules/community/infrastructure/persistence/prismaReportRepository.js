function toDomain(row) {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    reporterId: row.reporterId,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ReportRepository.js').ReportRepository}
 */
export function createPrismaReportRepository(prisma) {
  return {
    async create(report) {
      const row = await prisma.communityReport.create({
        data: {
          id: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          reporterId: report.reporterId,
          reason: report.reason,
          createdAt: report.createdAt,
        },
      });
      return toDomain(row);
    },

    async findById(id) {
      const row = await prisma.communityReport.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async findPendingByTarget(targetType, targetId, reporterId) {
      const row = await prisma.communityReport.findFirst({
        where: { targetType, targetId, reporterId, status: 'PENDING' },
      });
      return row ? toDomain(row) : null;
    },

    async listByStatus(status) {
      const rows = await prisma.communityReport.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },

    async dismiss(id, staffUserId, now) {
      const row = await prisma.communityReport.update({
        where: { id },
        data: { status: 'DISMISSED', resolvedAt: now, resolvedBy: staffUserId },
      });
      return toDomain(row);
    },
  };
}
