import { InvalidAppointmentState } from '../errors/InvalidAppointmentState.js';

export const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
});

/**
 * A scheduled psychology session -- carries zero clinical content by
 * design, scheduling logistics only. Framework-agnostic by construction: no
 * Express/Prisma imports anywhere in this file (enforced mechanically by
 * .dependency-cruiser.js, which also forbids any OTHER module from
 * importing this file at all, per the clinical-domain-isolated rule).
 */
export class ClinicalAppointment {
  constructor({
    id,
    clubId,
    playerId,
    practitionerId,
    discipline,
    periodStart,
    periodEnd,
    status = APPOINTMENT_STATUS.SCHEDULED,
    scheduledBy,
    createdAt = null,
    cancelledAt = null,
    cancelledBy = null,
    cancelReason = null,
    resolvedAt = null,
    resolvedBy = null,
  }) {
    this.id = id;
    this.clubId = clubId;
    this.playerId = playerId;
    this.practitionerId = practitionerId;
    this.discipline = discipline;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.status = status;
    this.scheduledBy = scheduledBy;
    this.createdAt = createdAt;
    this.cancelledAt = cancelledAt;
    this.cancelledBy = cancelledBy;
    this.cancelReason = cancelReason;
    this.resolvedAt = resolvedAt;
    this.resolvedBy = resolvedBy;
  }

  static schedule({
    id,
    clubId,
    playerId,
    practitionerId,
    discipline,
    periodStart,
    periodEnd,
    scheduledBy,
    now,
  }) {
    return new ClinicalAppointment({
      id,
      clubId,
      playerId,
      practitionerId,
      discipline,
      periodStart,
      periodEnd,
      status: APPOINTMENT_STATUS.SCHEDULED,
      scheduledBy,
      createdAt: now,
    });
  }

  /** Legal only from SCHEDULED. */
  cancel({ reason, cancelledBy, now }) {
    if (this.status !== APPOINTMENT_STATUS.SCHEDULED) {
      throw new InvalidAppointmentState(this.status, 'cancel');
    }
    this.status = APPOINTMENT_STATUS.CANCELLED;
    this.cancelledAt = now;
    this.cancelledBy = cancelledBy;
    this.cancelReason = reason;
  }

  /** Legal only from SCHEDULED -- the session happened. */
  markCompleted({ resolvedBy, now }) {
    if (this.status !== APPOINTMENT_STATUS.SCHEDULED) {
      throw new InvalidAppointmentState(this.status, 'markCompleted');
    }
    this.status = APPOINTMENT_STATUS.COMPLETED;
    this.resolvedAt = now;
    this.resolvedBy = resolvedBy;
  }

  /** Legal only from SCHEDULED -- the player didn't come. */
  markNoShow({ resolvedBy, now }) {
    if (this.status !== APPOINTMENT_STATUS.SCHEDULED) {
      throw new InvalidAppointmentState(this.status, 'markNoShow');
    }
    this.status = APPOINTMENT_STATUS.NO_SHOW;
    this.resolvedAt = now;
    this.resolvedBy = resolvedBy;
  }
}
