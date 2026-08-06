import { randomUUID } from 'node:crypto';

import { ClinicalAppointment } from '../../../../src/modules/clinical/domain/entities/ClinicalAppointment.js';
import { PractitionerTimeConflict } from '../../../../src/modules/clinical/domain/errors/PractitionerTimeConflict.js';

function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Returns real domain-entity instances (not plain data objects) so use
// cases can call .cancel()/.markCompleted()/.markNoShow() on what
// findById() returns, exactly like the real Prisma repository's toDomain()
// would. Also simulates the DB exclusion-constraint check in-memory so the
// PractitionerTimeConflict translation path is testable at the use-case
// level without a real Postgres connection.
export function createFakeAppointmentRepository() {
  const appointments = new Map();

  return {
    async create(appointment) {
      const conflict = [...appointments.values()].some(
        (a) =>
          a.practitionerId === appointment.practitionerId &&
          a.status === 'SCHEDULED' &&
          periodsOverlap(
            a.periodStart,
            a.periodEnd,
            appointment.periodStart,
            appointment.periodEnd,
          ),
      );
      if (conflict) {
        throw new PractitionerTimeConflict();
      }
      appointments.set(appointment.id, new ClinicalAppointment(appointment));
      return new ClinicalAppointment(appointment);
    },
    async findById(id) {
      const a = appointments.get(id);
      return a ? new ClinicalAppointment(a) : null;
    },
    async update(appointment) {
      appointments.set(appointment.id, new ClinicalAppointment(appointment));
      return new ClinicalAppointment(appointment);
    },
    async list({ playerId, practitionerId } = {}) {
      return [...appointments.values()]
        .filter((a) => !playerId || a.playerId === playerId)
        .filter((a) => !practitionerId || a.practitionerId === practitionerId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((a) => new ClinicalAppointment(a));
    },
    // Test-only: seed an appointment row directly, bypassing create().
    _seed(data) {
      appointments.set(data.id, new ClinicalAppointment({ createdAt: new Date(), ...data }));
    },
  };
}

export function createFakeNoteRepository() {
  const byId = new Map();

  return {
    async create({ playerId, practitionerId, appointmentId, noteType, visibility, content }) {
      const id = randomUUID();
      const note = {
        id,
        playerId,
        practitionerId,
        appointmentId: appointmentId ?? null,
        noteType,
        visibility,
        content,
        createdAt: new Date(),
      };
      byId.set(id, note);
      return note;
    },
    async listByPlayer(playerId) {
      return [...byId.values()]
        .filter((n) => n.playerId === playerId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async listVisibleByPlayer(playerId) {
      return [...byId.values()]
        .filter((n) => n.playerId === playerId && n.visibility === 'PLAYER_VISIBLE')
        .sort((a, b) => b.createdAt - a.createdAt);
    },
  };
}

/** @param {Set<string>} eligiblePlayerIds */
export function createFakePlayerEligibilityProvider(eligiblePlayerIds = new Set()) {
  return {
    async isEligiblePlayer(userId) {
      return eligiblePlayerIds.has(userId);
    },
  };
}

/** @param {Set<string>} eligiblePractitionerIds */
export function createFakePractitionerEligibilityProvider(eligiblePractitionerIds = new Set()) {
  return {
    async isEligiblePractitioner(userId) {
      return eligiblePractitionerIds.has(userId);
    },
  };
}

/** @param {Map<string, {firstName: string, lastName: string, email: string}>} summariesById */
export function createFakePlayerDirectoryProvider(summariesById = new Map()) {
  return {
    async getPlayerSummaries(userIds) {
      const result = new Map();
      for (const id of userIds) {
        if (summariesById.has(id)) result.set(id, summariesById.get(id));
      }
      return result;
    },
  };
}

/** @param {Date} now */
export function createFakeClock(now = new Date('2026-01-01T00:00:00.000Z')) {
  return { now: () => now };
}
