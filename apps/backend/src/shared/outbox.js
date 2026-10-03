/**
 * Outbox pattern (outbox_events): a module that changes something worth
 * announcing writes the event IN THE SAME TRANSACTION as the change, with
 * this helper. The notifications module delivers it afterwards, with
 * retries. So nothing is announced that didn't happen, and nothing that
 * happened is left unannounced.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} tx
 * @param {{ aggregateType: string, aggregateId: string, eventType: string, payload: object }} event
 */
export function writeOutboxEvent(tx, { aggregateType, aggregateId, eventType, payload }) {
  return tx.outboxEvent.create({ data: { aggregateType, aggregateId, eventType, payload } });
}
