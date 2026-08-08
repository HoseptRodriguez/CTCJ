import { OCCUPYING_STATUSES } from '@ctcj/shared';

import { Reservation } from '../../domain/entities/Reservation.js';
import { SlotNotAvailable } from '../../application/errors/SlotNotAvailable.js';

function toDomainReservation(row) {
  return new Reservation({
    id: row.id,
    clubId: row.clubId,
    courtId: row.courtId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    status: row.status,
    reservationType: row.reservationType,
    holderUserId: row.holderUserId,
    createdBy: row.createdBy,
    holdExpiresAt: row.holdExpiresAt,
    priceCop: row.priceCop,
    paymentId: row.paymentId,
    notes: row.notes,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/ReservationRepository.js').ReservationRepository}
 */
export function createPrismaReservationRepository(prisma) {
  return {
    /**
     * `period` (Postgres tstzrange) can't be set via Prisma's fluent client
     * (Unsupported field), so creation goes through raw SQL. This is the
     * insert the DB's EXCLUDE constraint guards -- a violation surfaces as
     * a raw-query error whose underlying Postgres SQLSTATE is 23P01, which
     * we translate to the domain SlotNotAvailable error. Optimistic
     * insert-and-catch, not check-then-insert, so concurrent holds on the
     * same slot can never both succeed regardless of timing.
     */
    async createHold(reservation) {
      try {
        const rows = await prisma.$queryRaw`
          INSERT INTO reservations
            (id, club_id, court_id, period, status, reservation_type,
             holder_user_id, created_by, hold_expires_at, price_cop, notes, updated_at)
          VALUES
            (${reservation.id}::uuid, ${reservation.clubId}::uuid, ${reservation.courtId}::uuid,
             tstzrange(${reservation.periodStart}::timestamptz, ${reservation.periodEnd}::timestamptz, '[)'),
             ${reservation.status}, ${reservation.reservationType},
             ${reservation.holderUserId}::uuid, ${reservation.createdBy}::uuid,
             ${reservation.holdExpiresAt}, ${reservation.priceCop}, ${reservation.notes}, now())
          RETURNING
            id, club_id AS "clubId", court_id AS "courtId",
            period_start AS "periodStart", period_end AS "periodEnd",
            status, reservation_type AS "reservationType",
            holder_user_id AS "holderUserId", created_by AS "createdBy",
            hold_expires_at AS "holdExpiresAt", price_cop AS "priceCop",
            payment_id AS "paymentId", notes
        `;
        return toDomainReservation(rows[0]);
      } catch (err) {
        if (err.code === 'P2010' && err.meta?.code === '23P01') {
          throw new SlotNotAvailable();
        }
        throw err;
      }
    },

    async findById(id) {
      const row = await prisma.reservation.findUnique({ where: { id } });
      return row ? toDomainReservation(row) : null;
    },

    async listOccupyingByClubAndDateRange(clubId, dayStart, dayEnd) {
      const rows = await prisma.reservation.findMany({
        where: {
          clubId,
          status: { in: OCCUPYING_STATUSES },
          periodStart: { lt: dayEnd },
          periodEnd: { gt: dayStart },
        },
        orderBy: { periodStart: 'asc' },
      });
      return rows.map(toDomainReservation);
    },

    async countOccupyingByHolder(holderUserId) {
      return prisma.reservation.count({
        where: { holderUserId, status: { in: OCCUPYING_STATUSES } },
      });
    },

    async listByHolderAndDateRange(holderUserId, from, to) {
      const rows = await prisma.reservation.findMany({
        where: {
          holderUserId,
          periodStart: { gte: from, lt: to },
        },
        orderBy: { periodStart: 'asc' },
      });
      return rows.map(toDomainReservation);
    },

    /**
     * Atomic conditional update -- a 0 result tells the caller the row was
     * no longer in `fromStatuses` (e.g. the expiry job already moved it),
     * which the in-memory domain check couldn't have known about.
     */
    async transitionStatus({ id, fromStatuses, toStatus, extra = {} }) {
      const result = await prisma.reservation.updateMany({
        where: { id, status: { in: fromStatuses } },
        data: { status: toStatus, ...extra },
      });
      return result.count;
    },
  };
}
