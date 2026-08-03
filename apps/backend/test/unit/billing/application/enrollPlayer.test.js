import { beforeEach, describe, expect, it } from 'vitest';

import { createEnrollPlayer } from '../../../../src/modules/billing/application/useCases/enrollPlayer.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { PlayerNotEligible } from '../../../../src/modules/billing/application/errors/PlayerNotEligible.js';
import { PlanNotActive } from '../../../../src/modules/billing/application/errors/PlanNotActive.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';

import {
  createFakePlanRepository,
  createFakeMembershipRepository,
  createFakePlayerEligibilityProvider,
} from './fakes.js';

const CLUB_ID = 'club-1';

function buildDeps() {
  return {
    planRepository: createFakePlanRepository(),
    membershipRepository: createFakeMembershipRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
  };
}

describe('enrollPlayer', () => {
  let deps;
  let enrollPlayer;
  let createPlan;

  beforeEach(() => {
    deps = buildDeps();
    enrollPlayer = createEnrollPlayer(deps);
    createPlan = createCreatePlan({ planRepository: deps.planRepository, clubId: CLUB_ID });
  });

  it('enrolls an eligible player successfully', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    const membership = await enrollPlayer({
      playerId: 'player-1',
      planId: plan.id,
      startDate: new Date('2026-01-01'),
      billingDay: 5,
    });
    expect(membership.playerId).toBe('player-1');
    expect(membership.status).toBe('ACTIVE');
  });

  it('throws PlayerNotEligible for a non-JUGADOR user', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await expect(
      enrollPlayer({
        playerId: 'not-a-player',
        planId: plan.id,
        startDate: new Date('2026-01-01'),
        billingDay: 5,
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it('throws PlanNotActive for an inactive plan', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    const stored = await deps.planRepository.findById(plan.id);
    stored.isActive = false;

    await expect(
      enrollPlayer({
        playerId: 'player-1',
        planId: plan.id,
        startDate: new Date('2026-01-01'),
        billingDay: 5,
      }),
    ).rejects.toThrow(PlanNotActive);
  });

  it('throws PlanNotFound for an unknown plan', async () => {
    await expect(
      enrollPlayer({
        playerId: 'player-1',
        planId: 'does-not-exist',
        startDate: new Date('2026-01-01'),
        billingDay: 5,
      }),
    ).rejects.toThrow(PlanNotFound);
  });
});
