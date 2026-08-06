import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateRecoveryPlan } from '../../../../src/modules/clinical/application/useCases/createRecoveryPlan.js';
import { DisciplineMismatch } from '../../../../src/modules/clinical/application/errors/DisciplineMismatch.js';
import { PlayerNotEligible } from '../../../../src/modules/clinical/application/errors/PlayerNotEligible.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';

import {
  createFakeClock,
  createFakePlayerEligibilityProvider,
  createFakePractitionerEligibilityProvider,
  createFakeRecoveryPlanRepository,
} from './fakes.js';

describe('createRecoveryPlan', () => {
  let recoveryPlanRepository;
  let createRecoveryPlan;

  beforeEach(() => {
    recoveryPlanRepository = createFakeRecoveryPlanRepository();
    createRecoveryPlan = createCreateRecoveryPlan({
      recoveryPlanRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['physio-1', 'PHYSIOTHERAPY'],
          ['psych-1', 'PSYCHOLOGY'],
        ]),
      ),
      clock: createFakeClock(new Date('2026-02-20')),
    });
  });

  it('creates an ACTIVE plan when both player and practitioner are eligible', async () => {
    const plan = await createRecoveryPlan({
      playerId: 'player-1',
      title: 'Rehabilitación de rodilla',
      goal: 'Recuperar rango de movimiento',
      visibility: 'PRIVATE',
      practitionerUserId: 'physio-1',
    });
    expect(plan.status).toBe('ACTIVE');
    expect(plan.playerId).toBe('player-1');
    expect(plan.practitionerId).toBe('physio-1');
  });

  it('throws PlayerNotEligible when the target does not hold JUGADOR', async () => {
    await expect(
      createRecoveryPlan({
        playerId: 'not-a-player',
        title: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'physio-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws PractitionerNotEligible when the author holds no clinical practitioner role', async () => {
    await expect(
      createRecoveryPlan({
        playerId: 'player-1',
        title: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'not-a-practitioner',
      }),
    ).rejects.toThrow(PractitionerNotEligible);
  });

  it('throws DisciplineMismatch when the author is a Psicologo, not a Fisioterapeuta', async () => {
    await expect(
      createRecoveryPlan({
        playerId: 'player-1',
        title: 'x',
        visibility: 'PRIVATE',
        practitionerUserId: 'psych-1',
      }),
    ).rejects.toThrow(DisciplineMismatch);
  });
});
