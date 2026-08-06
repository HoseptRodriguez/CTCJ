import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyAppointments } from '../../../../src/modules/clinical/application/useCases/getMyAppointments.js';

import { createFakeAppointmentRepository, createFakePlayerDirectoryProvider } from './fakes.js';

describe('getMyAppointments', () => {
  let appointmentRepository;

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
    appointmentRepository._seed({
      id: 'appt-2',
      clubId: 'club-1',
      playerId: 'player-2',
      practitionerId: 'psych-1',
      periodStart: new Date('2026-03-02T10:00:00Z'),
      periodEnd: new Date('2026-03-02T11:00:00Z'),
      status: 'SCHEDULED',
      scheduledBy: 'staff-1',
    });
  });

  it("scopes strictly to the given playerId, never returning another player's appointments", async () => {
    const getMyAppointments = createGetMyAppointments({
      appointmentRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(
        new Map([['psych-1', { firstName: 'Dra. Sofia', lastName: 'Reyes' }]]),
      ),
    });

    const results = await getMyAppointments({ playerId: 'player-1' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('appt-1');
    expect(results[0].practitionerName).toBe('Dra. Sofia Reyes');
  });
});
