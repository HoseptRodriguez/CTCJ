import { beforeEach, describe, expect, it } from 'vitest';

import { createDiscontinueRecoveryPlan } from '../../../../src/modules/clinical/application/useCases/discontinueRecoveryPlan.js';
import { RecoveryPlanNotFound } from '../../../../src/modules/clinical/application/errors/RecoveryPlanNotFound.js';
import { RecoveryPlan } from '../../../../src/modules/clinical/domain/entities/RecoveryPlan.js';
import { InvalidRecoveryPlanState } from '../../../../src/modules/clinical/domain/errors/InvalidRecoveryPlanState.js';

import { createFakeClock, createFakeRecoveryPlanRepository } from './fakes.js';

describe('discontinueRecoveryPlan', () => {
  let recoveryPlanRepository;
  let discontinueRecoveryPlan;

  beforeEach(async () => {
    recoveryPlanRepository = createFakeRecoveryPlanRepository();
    await recoveryPlanRepository.create(
      RecoveryPlan.create({
        id: 'plan-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        title: 'Rehabilitación de rodilla',
        goal: null,
        visibility: 'PRIVATE',
        now: new Date('2026-02-20'),
      }),
    );
    discontinueRecoveryPlan = createDiscontinueRecoveryPlan({
      recoveryPlanRepository,
      clock: createFakeClock(new Date('2026-03-01')),
    });
  });

  it('marks an ACTIVE plan DISCONTINUED with a reason', async () => {
    const plan = await discontinueRecoveryPlan({
      planId: 'plan-1',
      reason: 'jugador abandonó el club',
      resolvedByUserId: 'physio-1',
    });
    expect(plan.status).toBe('DISCONTINUED');
    expect(plan.discontinueReason).toBe('jugador abandonó el club');
  });

  it('throws RecoveryPlanNotFound for an unknown id', async () => {
    await expect(
      discontinueRecoveryPlan({ planId: 'nonexistent', reason: 'x', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(RecoveryPlanNotFound);
  });

  it('throws InvalidRecoveryPlanState once already DISCONTINUED', async () => {
    await discontinueRecoveryPlan({ planId: 'plan-1', reason: 'x', resolvedByUserId: 'physio-1' });
    await expect(
      discontinueRecoveryPlan({ planId: 'plan-1', reason: 'y', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(InvalidRecoveryPlanState);
  });
});
