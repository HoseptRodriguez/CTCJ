import { beforeEach, describe, expect, it } from 'vitest';

import { createCompleteRecoveryPlan } from '../../../../src/modules/clinical/application/useCases/completeRecoveryPlan.js';
import { RecoveryPlanNotFound } from '../../../../src/modules/clinical/application/errors/RecoveryPlanNotFound.js';
import { RecoveryPlan } from '../../../../src/modules/clinical/domain/entities/RecoveryPlan.js';
import { InvalidRecoveryPlanState } from '../../../../src/modules/clinical/domain/errors/InvalidRecoveryPlanState.js';

import { createFakeClock, createFakeRecoveryPlanRepository } from './fakes.js';

describe('completeRecoveryPlan', () => {
  let recoveryPlanRepository;
  let completeRecoveryPlan;

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
    completeRecoveryPlan = createCompleteRecoveryPlan({
      recoveryPlanRepository,
      clock: createFakeClock(new Date('2026-03-01')),
    });
  });

  it('marks an ACTIVE plan COMPLETED', async () => {
    const plan = await completeRecoveryPlan({ planId: 'plan-1', resolvedByUserId: 'physio-1' });
    expect(plan.status).toBe('COMPLETED');
    expect(plan.resolvedBy).toBe('physio-1');
  });

  it('throws RecoveryPlanNotFound for an unknown id', async () => {
    await expect(
      completeRecoveryPlan({ planId: 'nonexistent', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(RecoveryPlanNotFound);
  });

  it('throws InvalidRecoveryPlanState once already COMPLETED', async () => {
    await completeRecoveryPlan({ planId: 'plan-1', resolvedByUserId: 'physio-1' });
    await expect(
      completeRecoveryPlan({ planId: 'plan-1', resolvedByUserId: 'physio-1' }),
    ).rejects.toThrow(InvalidRecoveryPlanState);
  });
});
