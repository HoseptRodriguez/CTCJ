import { PaymentConflict } from '../../application/errors/PaymentConflict.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PaymentRepository.js').PaymentRepository}
 */
export function createPrismaPaymentRepository(prisma) {
  return {
    async record({ id, clubId, reservationId, amountCop, method, recordedBy, notes, now }) {
      return prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            id,
            clubId,
            amountCop,
            method,
            recordedBy,
            notes,
            recordedAt: now,
          },
        });

        // Conditional stamp, same optimistic-guard idiom as
        // prismaReservationRepository's transitionStatus -- a 0 count means
        // the reservation stopped being CONFIRMED-and-unpaid between the
        // caller's read and this write (a race), which rolls the payment
        // insert back too since both happen inside this transaction.
        const stamped = await tx.reservation.updateMany({
          where: { id: reservationId, status: 'CONFIRMED', paymentId: null },
          data: { paymentId: payment.id },
        });
        if (stamped.count === 0) {
          throw new PaymentConflict();
        }

        return payment;
      });
    },

    async listByDateRange(from, to) {
      return prisma.payment.findMany({
        where: { recordedAt: { gte: from, lt: to } },
        orderBy: { recordedAt: 'desc' },
      });
    },

    async getTotals(from, to) {
      const result = await prisma.payment.aggregate({
        where: { recordedAt: { gte: from, lt: to } },
        _sum: { amountCop: true },
        _count: true,
      });
      return { totalCop: result._sum.amountCop ?? 0n, count: result._count };
    },
  };
}
