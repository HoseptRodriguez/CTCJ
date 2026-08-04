import { Invoice } from '../../domain/entities/Invoice.js';

function toDomain(record, lines) {
  const invoice = new Invoice({
    id: record.id,
    membershipId: record.membershipId,
    status: record.status,
    amountCop: record.amountCop,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    dueDate: record.dueDate,
    issuedAt: record.issuedAt,
    generatedBy: record.generatedBy,
    paidAmountCop: record.paidAmountCop,
    paidMethod: record.paidMethod,
    paidBy: record.paidBy,
    paidAt: record.paidAt,
    paidNotes: record.paidNotes,
    cancelledAt: record.cancelledAt,
    cancelledBy: record.cancelledBy,
    cancelReason: record.cancelReason,
    createdAt: record.createdAt,
  });
  if (lines) {
    invoice.lines = lines.map((line) => ({
      id: line.id,
      description: line.description,
      amountCop: line.amountCop,
    }));
  }
  return invoice;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/InvoiceRepository.js').InvoiceRepository}
 */
export function createPrismaInvoiceRepository(prisma) {
  return {
    async create(
      { membershipId, amountCop, periodStart, periodEnd, dueDate, issuedAt, generatedBy },
      lines,
    ) {
      const record = await prisma.invoice.create({
        data: {
          membershipId,
          amountCop: BigInt(amountCop),
          periodStart,
          periodEnd,
          dueDate,
          issuedAt,
          generatedBy,
          lines: {
            create: lines.map((line) => ({
              description: line.description,
              amountCop: BigInt(line.amountCop),
            })),
          },
        },
        include: { lines: true },
      });
      return toDomain(record, record.lines);
    },

    async findById(id) {
      const record = await prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
      return record ? toDomain(record, record.lines) : null;
    },

    async findByMembershipAndPeriod(membershipId, periodStart) {
      const record = await prisma.invoice.findUnique({
        where: { membershipId_periodStart: { membershipId, periodStart } },
      });
      return record ? toDomain(record) : null;
    },

    async listByMembership(membershipId) {
      const records = await prisma.invoice.findMany({
        where: { membershipId },
        orderBy: { periodStart: 'desc' },
      });
      return records.map((record) => toDomain(record));
    },

    async update(invoice) {
      const record = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invoice.status,
          paidAmountCop: invoice.paidAmountCop != null ? BigInt(invoice.paidAmountCop) : null,
          paidMethod: invoice.paidMethod,
          paidBy: invoice.paidBy,
          paidAt: invoice.paidAt,
          paidNotes: invoice.paidNotes,
          cancelledAt: invoice.cancelledAt,
          cancelledBy: invoice.cancelledBy,
          cancelReason: invoice.cancelReason,
        },
        include: { lines: true },
      });
      return toDomain(record, record.lines);
    },

    async listAll({ status, paidFrom, paidTo } = {}) {
      const records = await prisma.invoice.findMany({
        where: {
          ...(status && { status }),
          ...(paidFrom && paidTo && { paidAt: { gte: paidFrom, lt: paidTo } }),
        },
        include: { membership: { select: { playerId: true } } },
        orderBy: status === 'PENDING' ? { dueDate: 'asc' } : { paidAt: 'desc' },
      });
      return records.map((record) => {
        const invoice = toDomain(record);
        invoice.playerId = record.membership.playerId;
        return invoice;
      });
    },

    async getTotals({ status, paidFrom, paidTo } = {}) {
      const result = await prisma.invoice.aggregate({
        where: {
          ...(status && { status }),
          ...(paidFrom && paidTo && { paidAt: { gte: paidFrom, lt: paidTo } }),
        },
        _sum: { amountCop: true },
        _count: true,
      });
      return { totalCop: result._sum.amountCop ?? 0n, count: result._count };
    },
  };
}
