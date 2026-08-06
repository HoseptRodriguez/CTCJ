import { beforeEach, describe, expect, it } from 'vitest';

import { createMarkCompleted } from '../../../../src/modules/clinical/application/useCases/markCompleted.js';
import { AppointmentNotFound } from '../../../../src/modules/clinical/application/errors/AppointmentNotFound.js';
import { InvalidAppointmentState } from '../../../../src/modules/clinical/domain/errors/InvalidAppointmentState.js';

import { createFakeAppointmentRepository, createFakeClock } from './fakes.js';

describe('markCompleted', () => {
  let appointmentRepository;
  let markCompleted;

  beforeEach(() => {
    appointmentRepository = createFakeAppointmentRepository();
    appointmentRepository._seed({
      id: 'appt-1',
      clubId: 'club-1',
      playerId: 'player-1',
      practitionerId: 'psych-1',
      periodStart: new Date('2026-03-01T10:00:00Z'),
      periodEnd: new Date('2026-03-01T11:00:00Z'),
      status: 'SCHEDULED',
      scheduledBy: 'staff-1',
    });
    markCompleted = createMarkCompleted({
      appointmentRepository,
      clock: createFakeClock(new Date('2026-03-01T11:05:00Z')),
    });
  });

  it('marks a SCHEDULED appointment COMPLETED', async () => {
    const appt = await markCompleted({ appointmentId: 'appt-1', resolvedByUserId: 'psych-1' });
    expect(appt.status).toBe('COMPLETED');
    expect(appt.resolvedBy).toBe('psych-1');
  });

  it('throws AppointmentNotFound for an unknown id', async () => {
    await expect(
      markCompleted({ appointmentId: 'nonexistent', resolvedByUserId: 'psych-1' }),
    ).rejects.toThrow(AppointmentNotFound);
  });

  it('throws InvalidAppointmentState once already COMPLETED', async () => {
    await markCompleted({ appointmentId: 'appt-1', resolvedByUserId: 'psych-1' });
    await expect(
      markCompleted({ appointmentId: 'appt-1', resolvedByUserId: 'psych-1' }),
    ).rejects.toThrow(InvalidAppointmentState);
  });
});
