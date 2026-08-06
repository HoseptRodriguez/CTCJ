import { ClinicalAppointment } from '../../domain/entities/ClinicalAppointment.js';
import { PractitionerTimeConflict } from '../../domain/errors/PractitionerTimeConflict.js';

function toDomain(row) {
  return new ClinicalAppointment({
    id: row.id,
    clubId: row.clubId,
    playerId: row.playerId,
    practitionerId: row.practitionerId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    status: row.status,
    scheduledBy: row.scheduledBy,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancelReason: row.cancelReason,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/AppointmentRepository.js').AppointmentRepository}
 */
export function createPrismaAppointmentRepository(prisma) {
  return {
    /**
     * `period` (Postgres tstzrange) can't be set via Prisma's fluent client
     * (Unsupported field), so creation goes through raw SQL, reusing
     * booking's createHold pattern exactly. A violation of the DB's
     * exclusion constraint surfaces as a raw-query error whose underlying
     * Postgres SQLSTATE is 23P01, translated here to PractitionerTimeConflict.
     * Optimistic insert-and-catch, not check-then-insert, so two concurrent
     * scheduling attempts for the same practitioner/time can never both succeed.
     */
    async create(appointment) {
      try {
        const rows = await prisma.$queryRaw`
          INSERT INTO clinical_appointments
            (id, club_id, player_id, practitioner_id, period, status, scheduled_by)
          VALUES
            (${appointment.id}::uuid, ${appointment.clubId}::uuid, ${appointment.playerId}::uuid,
             ${appointment.practitionerId}::uuid,
             tstzrange(${appointment.periodStart}::timestamptz, ${appointment.periodEnd}::timestamptz, '[)'),
             ${appointment.status}, ${appointment.scheduledBy}::uuid)
          RETURNING
            id, club_id AS "clubId", player_id AS "playerId", practitioner_id AS "practitionerId",
            period_start AS "periodStart", period_end AS "periodEnd",
            status, scheduled_by AS "scheduledBy", created_at AS "createdAt",
            cancelled_at AS "cancelledAt", cancelled_by AS "cancelledBy", cancel_reason AS "cancelReason",
            resolved_at AS "resolvedAt", resolved_by AS "resolvedBy"
        `;
        return toDomain(rows[0]);
      } catch (err) {
        if (err.code === 'P2010' && err.meta?.code === '23P01') {
          throw new PractitionerTimeConflict();
        }
        throw err;
      }
    },

    async findById(id) {
      const row = await prisma.clinicalAppointment.findUnique({ where: { id } });
      return row ? toDomain(row) : null;
    },

    async update(appointment) {
      const row = await prisma.clinicalAppointment.update({
        where: { id: appointment.id },
        data: {
          status: appointment.status,
          cancelledAt: appointment.cancelledAt,
          cancelledBy: appointment.cancelledBy,
          cancelReason: appointment.cancelReason,
          resolvedAt: appointment.resolvedAt,
          resolvedBy: appointment.resolvedBy,
        },
      });
      return toDomain(row);
    },

    async list({ playerId, practitionerId } = {}) {
      const rows = await prisma.clinicalAppointment.findMany({
        where: {
          ...(playerId && { playerId }),
          ...(practitionerId && { practitionerId }),
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toDomain);
    },
  };
}
