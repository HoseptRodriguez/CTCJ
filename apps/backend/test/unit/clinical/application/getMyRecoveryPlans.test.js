import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyRecoveryPlans } from '../../../../src/modules/clinical/application/useCases/getMyRecoveryPlans.js';
import { RecoveryPlan } from '../../../../src/modules/clinical/domain/entities/RecoveryPlan.js';

import { createFakeRecoveryPlanRepository } from './fakes.js';

describe('getMyRecoveryPlans', () => {
  let recoveryPlanRepository;
  let getMyRecoveryPlans;

  beforeEach(() => {
    recoveryPlanRepository = createFakeRecoveryPlanRepository();
    getMyRecoveryPlans = createGetMyRecoveryPlans({ recoveryPlanRepository });
  });

  it('returns only PLAYER_VISIBLE plans, never PRIVATE ones', async () => {
    await recoveryPlanRepository.create(
      RecoveryPlan.create({
        id: 'plan-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        title: 'private plan',
        goal: null,
        visibility: 'PRIVATE',
        now: new Date(),
      }),
    );
    await recoveryPlanRepository.create(
      RecoveryPlan.create({
        id: 'plan-2',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        title: 'visible plan',
        goal: null,
        visibility: 'PLAYER_VISIBLE',
        now: new Date(),
      }),
    );

    const result = await getMyRecoveryPlans({ playerId: 'player-1' });
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].title).toBe('visible plan');
  });
});
