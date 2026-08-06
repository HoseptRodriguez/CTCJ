import { beforeEach, describe, expect, it } from 'vitest';

import { createListAppointments } from '../../../../src/modules/clinical/application/useCases/listAppointments.js';

import { createFakeAppointmentRepository, createFakePlayerDirectoryProvider } from './fakes.js';

describe('listAppointments', () => {
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
  });

  it('enriches player and practitioner ids with names', async () => {
    const listAppointments = createListAppointments({
      appointmentRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(
        new Map([
          ['player-1', { firstName: 'Ana', lastName: 'Gomez' }],
          ['psych-1', { firstName: 'Dra. Sofia', lastName: 'Reyes' }],
        ]),
      ),
    });

    const [appt] = await listAppointments({});
    expect(appt.playerName).toBe('Ana Gomez');
    expect(appt.practitionerName).toBe('Dra. Sofia Reyes');
  });

  it('filters by playerId', async () => {
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
    const listAppointments = createListAppointments({
      appointmentRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    });

    const results = await listAppointments({ playerId: 'player-1' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('appt-1');
  });
});
