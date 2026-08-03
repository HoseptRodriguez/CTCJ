import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlayerMemberships } from '../../../../src/modules/billing/application/useCases/listPlayerMemberships.js';
import { createGetMyPlayerMemberships } from '../../../../src/modules/billing/application/useCases/getMyPlayerMemberships.js';
import { createListAdjustments } from '../../../../src/modules/billing/application/useCases/listAdjustments.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { MembershipNotFound } from '../../../../src/modules/billing/application/errors/MembershipNotFound.js';

import {
  createFakePlanRepository,
  createFakeMembershipRepository,
  createFakeAdjustmentRepository,
} from './fakes.js';

const CLUB_ID = 'club-1';

function buildDeps() {
  return {
    planRepository: createFakePlanRepository(),
    membershipRepository: createFakeMembershipRepository(),
    adjustmentRepository: createFakeAdjustmentRepository(),
  };
}

describe('listPlayerMemberships / getMyPlayerMemberships', () => {
  let deps;
  let listPlayerMemberships;
  let getMyPlayerMemberships;

  beforeEach(() => {
    deps = buildDeps();
    listPlayerMemberships = createListPlayerMemberships(deps);
    getMyPlayerMemberships = createGetMyPlayerMemberships(deps);
  });

  it('returns an empty array for a player with no memberships', async () => {
    expect(await listPlayerMemberships({ playerId: 'player-1' })).toEqual([]);
  });

  it('returns enriched rows with plan name and current price', async () => {
    const createPlan = createCreatePlan({ planRepository: deps.planRepository, clubId: CLUB_ID });
    const setPlanPrice = createSetPlanPrice({ planRepository: deps.planRepository });
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });
    await deps.membershipRepository.create({
      playerId: 'player-1',
      planId: plan.id,
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });

    const result = await listPlayerMemberships({ playerId: 'player-1' });
    expect(result).toHaveLength(1);
    expect(result[0].planName).toBe('Iniciación');
    expect(result[0].currentPriceCop).toBe(50000);
  });

  it('getMyPlayerMemberships scopes to the given playerId, same enrichment', async () => {
    const createPlan = createCreatePlan({ planRepository: deps.planRepository, clubId: CLUB_ID });
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await deps.membershipRepository.create({
      playerId: 'player-1',
      planId: plan.id,
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });
    await deps.membershipRepository.create({
      playerId: 'player-2',
      planId: plan.id,
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });

    const mine = await getMyPlayerMemberships({ playerId: 'player-1' });
    expect(mine).toHaveLength(1);
    expect(mine[0].playerId).toBe('player-1');
  });
});

describe('listAdjustments', () => {
  let deps;
  let listAdjustments;

  beforeEach(() => {
    deps = buildDeps();
    listAdjustments = createListAdjustments(deps);
  });

  it('returns an empty array for a membership with no adjustments', async () => {
    const membership = await deps.membershipRepository.create({
      playerId: 'player-1',
      planId: 'plan-1',
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });
    expect(await listAdjustments({ membershipId: membership.id })).toEqual([]);
  });

  it('throws MembershipNotFound for an unknown membership id', async () => {
    await expect(listAdjustments({ membershipId: 'does-not-exist' })).rejects.toThrow(
      MembershipNotFound,
    );
  });
});
