import { beforeEach, describe, expect, it } from 'vitest';

import { createCancelAppointment } from '../../../../src/modules/clinical/application/useCases/cancelAppointment.js';
import { AppointmentNotFound } from '../../../../src/modules/clinical/application/errors/AppointmentNotFound.js';
import { InvalidAppointmentState } from '../../../../src/modules/clinical/domain/errors/InvalidAppointmentState.js';

import { createFakeAppointmentRepository, createFakeClock } from './fakes.js';

function seedAppointment(repo, overrides = {}) {
  repo._seed({
    id: 'appt-1',
    clubId: 'club-1',
    playerId: 'player-1',
    practitionerId: 'psych-1',
    periodStart: new Date('2026-03-01T10:00:00Z'),
    periodEnd: new Date('2026-03-01T11:00:00Z'),
    status: 'SCHEDULED',
    scheduledBy: 'staff-1',
    ...overrides,
  });
}

describe('cancelAppointment', () => {
  let appointmentRepository;
  let cancelAppointment;

  beforeEach(() => {
    appointmentRepository = createFakeAppointmentRepository();
    seedAppointment(appointmentRepository);
    cancelAppointment = createCancelAppointment({
      appointmentRepository,
      clock: createFakeClock(new Date('2026-02-25')),
    });
  });

  it('cancels a SCHEDULED appointment', async () => {
    const appt = await cancelAppointment({
      appointmentId: 'appt-1',
      reason: 'jugador no puede asistir',
      cancelledByUserId: 'staff-2',
    });
    expect(appt.status).toBe('CANCELLED');
    expect(appt.cancelReason).toBe('jugador no puede asistir');
  });

  it('throws AppointmentNotFound for an unknown id', async () => {
    await expect(
      cancelAppointment({
        appointmentId: 'nonexistent',
        reason: 'x',
        cancelledByUserId: 'staff-1',
      }),
    ).rejects.toThrow(AppointmentNotFound);
  });

  it('throws InvalidAppointmentState once already CANCELLED', async () => {
    await cancelAppointment({ appointmentId: 'appt-1', reason: 'x', cancelledByUserId: 'staff-1' });
    await expect(
      cancelAppointment({ appointmentId: 'appt-1', reason: 'y', cancelledByUserId: 'staff-1' }),
    ).rejects.toThrow(InvalidAppointmentState);
  });
});
