function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function toRow(record) {
  return {
    id: record.id,
    clubId: record.clubId,
    radicado: record.radicado,
    userId: record.userId,
    requestType: record.requestType,
    kind: record.kind,
    description: record.description,
    status: record.status,
    receivedAt: record.receivedAt,
    dueOn: ymd(record.dueOn),
    answer: record.answer,
    answeredAt: record.answeredAt,
    answeredBy: record.answeredBy,
    accountAnonymizedAt: record.accountAnonymizedAt,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/DataRequestRepository.js').DataRequestRepository}
 */
export function createPrismaDataRequestRepository(prisma) {
  return {
    async nextRadicado(year) {
      const [{ n }] =
        await prisma.$queryRaw`SELECT nextval('data_subject_request_radicado_seq')::int AS n`;
      return `CTCJ-${year}-${String(n).padStart(5, '0')}`;
    },

    async create(request) {
      const record = await prisma.dataSubjectRequest.create({
        data: {
          id: request.id,
          clubId: request.clubId,
          radicado: request.radicado,
          userId: request.userId,
          requestType: request.requestType,
          kind: request.kind,
          description: request.description,
          status: request.status,
          receivedAt: request.receivedAt,
          dueOn: new Date(`${request.dueOn}T00:00:00Z`),
        },
      });
      return toRow(record);
    },

    async findById(id) {
      const record = await prisma.dataSubjectRequest.findUnique({ where: { id } });
      return record ? toRow(record) : null;
    },

    async listByUser(userId) {
      const records = await prisma.dataSubjectRequest.findMany({
        where: { userId },
        orderBy: { receivedAt: 'desc' },
      });
      return records.map(toRow);
    },

    async list({ clubId, openOnly = false }) {
      const records = await prisma.dataSubjectRequest.findMany({
        where: { clubId, ...(openOnly ? { status: { not: 'RESPONDIDA' } } : {}) },
        orderBy: [{ dueOn: 'asc' }, { receivedAt: 'asc' }],
      });
      // Open ones first (by deadline), then the answered ones.
      return records
        .map(toRow)
        .sort((a, b) => Number(a.status === 'RESPONDIDA') - Number(b.status === 'RESPONDIDA'));
    },

    async update(request) {
      const record = await prisma.dataSubjectRequest.update({
        where: { id: request.id },
        data: {
          status: request.status,
          answer: request.answer,
          answeredAt: request.answeredAt,
          answeredBy: request.answeredBy,
          accountAnonymizedAt: request.accountAnonymizedAt,
        },
      });
      return toRow(record);
    },
  };
}
