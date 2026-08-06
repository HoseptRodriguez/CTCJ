import { beforeEach, describe, expect, it } from 'vitest';

import { createListRecoveryPlans } from '../../../../src/modules/clinical/application/useCases/listRecoveryPlans.js';
import { DisciplineMismatch } from '../../../../src/modules/clinical/application/errors/DisciplineMismatch.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';
import { RecoveryPlan } from '../../../../src/modules/clinical/domain/entities/RecoveryPlan.js';

import {
  createFakePractitionerEligibilityProvider,
  createFakeRecoveryPlanRepository,
} from './fakes.js';

describe('listRecoveryPlans', () => {
  let recoveryPlanRepository;
  let listRecoveryPlans;

  beforeEach(async () => {
    recoveryPlanRepository = createFakeRecoveryPlanRepository();
    await recoveryPlanRepository.create(
      RecoveryPlan.create({
        id: 'plan-1',
        playerId: 'player-1',
        practitionerId: 'physio-1',
        title: 'x',
        goal: null,
        visibility: 'PRIVATE',
        now: new Date('2026-02-20'),
      }),
    );
    listRecoveryPlans = createListRecoveryPlans({
      recoveryPlanRepository,
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['physio-1', 'PHYSIOTHERAPY'],
          ['psych-1', 'PSYCHOLOGY'],
        ]),
      ),
    });
  });

  it('returns plans for a Fisioterapeuta caller', async () => {
    const result = await listRecoveryPlans({
      playerId: 'player-1',
      practitionerUserId: 'physio-1',
    });
    expect(result.plans).toHaveLength(1);
  });

  it('throws DisciplineMismatch for a Psicologo caller', async () => {
    await expect(
      listRecoveryPlans({ playerId: 'player-1', practitionerUserId: 'psych-1' }),
    ).rejects.toThrow(DisciplineMismatch);
  });

  it('throws PractitionerNotEligible for a non-practitioner caller', async () => {
    await expect(
      listRecoveryPlans({ playerId: 'player-1', practitionerUserId: 'not-a-practitioner' }),
    ).rejects.toThrow(PractitionerNotEligible);
  });
});
