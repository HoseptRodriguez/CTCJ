import { beforeEach, describe, expect, it } from 'vitest';

import { createScheduleAppointment } from '../../../../src/modules/clinical/application/useCases/scheduleAppointment.js';
import { PlayerNotEligible } from '../../../../src/modules/clinical/application/errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';
import { PractitionerTimeConflict } from '../../../../src/modules/clinical/domain/errors/PractitionerTimeConflict.js';

import {
  createFakeAppointmentRepository,
  createFakePlayerEligibilityProvider,
  createFakePractitionerEligibilityProvider,
  createFakeClock,
} from './fakes.js';

describe('scheduleAppointment', () => {
  let appointmentRepository;
  let scheduleAppointment;

  beforeEach(() => {
    appointmentRepository = createFakeAppointmentRepository();
    scheduleAppointment = createScheduleAppointment({
      appointmentRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([['psych-1', 'PSYCHOLOGY']]),
      ),
      clock: createFakeClock(new Date('2026-02-20')),
      clubId: 'club-1',
    });
  });

  const baseInput = {
    playerId: 'player-1',
    practitionerId: 'psych-1',
    periodStart: new Date('2026-03-01T10:00:00Z'),
    periodEnd: new Date('2026-03-01T11:00:00Z'),
    scheduledByUserId: 'staff-1',
  };

  it('schedules an appointment when both player and practitioner are eligible', async () => {
    const appt = await scheduleAppointment(baseInput);
    expect(appt.status).toBe('SCHEDULED');
    expect(appt.playerId).toBe('player-1');
    expect(appt.practitionerId).toBe('psych-1');
  });

  it('resolves the discipline server-side from the practitioner, not from the caller', async () => {
    const appt = await scheduleAppointment(baseInput);
    expect(appt.discipline).toBe('PSYCHOLOGY');
  });

  it('throws PlayerNotEligible when the target does not hold JUGADOR', async () => {
    await expect(scheduleAppointment({ ...baseInput, playerId: 'not-a-player' })).rejects.toThrow(
      PlayerNotEligible,
    );
  });

  it('throws PractitionerNotEligible when the target does not hold a clinical role', async () => {
    await expect(
      scheduleAppointment({ ...baseInput, practitionerId: 'not-a-practitioner' }),
    ).rejects.toThrow(PractitionerNotEligible);
  });

  it('throws PractitionerTimeConflict for an overlapping appointment with the same practitioner', async () => {
    await scheduleAppointment(baseInput);
    await expect(
      scheduleAppointment({
        ...baseInput,
        periodStart: new Date('2026-03-01T10:30:00Z'),
        periodEnd: new Date('2026-03-01T11:30:00Z'),
      }),
    ).rejects.toThrow(PractitionerTimeConflict);
  });

  it('allows a back-to-back (non-overlapping) appointment for the same practitioner', async () => {
    await scheduleAppointment(baseInput);
    const second = await scheduleAppointment({
      ...baseInput,
      periodStart: new Date('2026-03-01T11:00:00Z'),
      periodEnd: new Date('2026-03-01T12:00:00Z'),
    });
    expect(second.status).toBe('SCHEDULED');
  });
});
