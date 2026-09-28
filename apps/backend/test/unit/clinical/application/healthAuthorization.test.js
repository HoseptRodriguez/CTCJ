import { beforeEach, describe, expect, it } from 'vitest';

import { HealthAuthorizationRequired } from '../../../../src/modules/clinical/application/errors/HealthAuthorizationRequired.js';
import { createScheduleAppointment } from '../../../../src/modules/clinical/application/useCases/scheduleAppointment.js';
import { createCreateNote } from '../../../../src/modules/clinical/application/useCases/createNote.js';
import { createCreateMedicalHistoryEntry } from '../../../../src/modules/clinical/application/useCases/createMedicalHistoryEntry.js';
import { createCreateRecoveryPlan } from '../../../../src/modules/clinical/application/useCases/createRecoveryPlan.js';
import { createSetFitnessStatus } from '../../../../src/modules/clinical/application/useCases/setFitnessStatus.js';

import {
  createFakeAppointmentRepository,
  createFakeClock,
  createFakeFitnessStatusRepository,
  createFakeHealthAuthorizationProvider,
  createFakeMedicalHistoryRepository,
  createFakeNoteRepository,
  createFakePlayerEligibilityProvider,
  createFakePractitionerEligibilityProvider,
  createFakeRecoveryPlanRepository,
} from './fakes.js';

/**
 * Health data (Ley 1581 de 2012, arts. 5 y 6) is only recorded with the
 * player's explicit authorization in force (the guardian's, for a minor).
 */
describe('health-data authorization gate', () => {
  let deps;
  let health;

  beforeEach(() => {
    health = createFakeHealthAuthorizationProvider(new Set());
    deps = {
      appointmentRepository: createFakeAppointmentRepository(),
      noteRepository: createFakeNoteRepository(),
      medicalHistoryRepository: createFakeMedicalHistoryRepository(),
      recoveryPlanRepository: createFakeRecoveryPlanRepository(),
      fitnessStatusRepository: createFakeFitnessStatusRepository(),
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      healthAuthorizationProvider: health,
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['psych-1', 'PSYCHOLOGY'],
          ['physio-1', 'PHYSIOTHERAPY'],
        ]),
      ),
      clock: createFakeClock(new Date('2026-02-20')),
      clubId: 'club-1',
    };
  });

  const actions = {
    'schedule an appointment': () =>
      createScheduleAppointment(deps)({
        playerId: 'player-1',
        practitionerId: 'psych-1',
        periodStart: new Date('2026-03-01T10:00:00Z'),
        periodEnd: new Date('2026-03-01T11:00:00Z'),
        scheduledByUserId: 'staff-1',
      }),
    'write a note': () =>
      createCreateNote(deps)({
        playerId: 'player-1',
        noteType: 'FOLLOW_UP',
        visibility: 'PRIVATE',
        content: 'x',
        practitionerUserId: 'psych-1',
      }),
    'add to the medical history': () =>
      createCreateMedicalHistoryEntry(deps)({
        playerId: 'player-1',
        condition: 'Esguince',
        description: 'Grado II',
        visibility: 'PRIVATE',
        occurredAt: new Date('2026-01-15'),
        practitionerUserId: 'physio-1',
      }),
    'create a recovery plan': () =>
      createCreateRecoveryPlan(deps)({
        playerId: 'player-1',
        title: 'Rodilla',
        goal: 'Movilidad',
        visibility: 'PRIVATE',
        practitionerUserId: 'physio-1',
      }),
    'set the fitness status': () =>
      createSetFitnessStatus(deps)({
        playerId: 'player-1',
        practitionerUserId: 'physio-1',
        status: 'FIT',
      }),
  };

  for (const [name, run] of Object.entries(actions)) {
    it(`can't ${name} without the authorization, and can once it's given`, async () => {
      await expect(run()).rejects.toBeInstanceOf(HealthAuthorizationRequired);
      health.authorizedPlayerIds.add('player-1');
      await expect(run()).resolves.toBeTruthy();
    });
  }

  it('nothing is saved when refused', async () => {
    await expect(actions['write a note']()).rejects.toBeInstanceOf(HealthAuthorizationRequired);
    expect(await deps.noteRepository.listByPlayer('player-1')).toEqual([]);
  });
});
