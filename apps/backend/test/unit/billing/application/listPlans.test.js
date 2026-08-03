import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlans } from '../../../../src/modules/billing/application/useCases/listPlans.js';
import { createListPlanPrices } from '../../../../src/modules/billing/application/useCases/listPlanPrices.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';

import { createFakePlanRepository } from './fakes.js';

const CLUB_ID = 'club-1';

describe('listPlans', () => {
  let planRepository;
  let listPlans;
  let createPlan;
  let setPlanPrice;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    listPlans = createListPlans({ planRepository, clubId: CLUB_ID });
    createPlan = createCreatePlan({ planRepository, clubId: CLUB_ID });
    setPlanPrice = createSetPlanPrice({ planRepository });
  });

  it('returns an empty array when there are no plans', async () => {
    expect(await listPlans()).toEqual([]);
  });

  it('enriches each plan with its current price', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });

    const result = await listPlans();
    expect(result).toHaveLength(1);
    expect(result[0].currentPriceCop).toBe(50000);
  });

  it('returns null currentPriceCop for a plan with no price yet', async () => {
    await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    const result = await listPlans();
    expect(result[0].currentPriceCop).toBeNull();
  });
});

describe('listPlanPrices', () => {
  let planRepository;
  let listPlanPrices;
  let createPlan;
  let setPlanPrice;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    listPlanPrices = createListPlanPrices({ planRepository });
    createPlan = createCreatePlan({ planRepository, clubId: CLUB_ID });
    setPlanPrice = createSetPlanPrice({ planRepository });
  });

  it('returns the full price history, not just the vigente price', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 60000,
      validFrom: new Date('2026-03-01'),
      createdByUserId: 'admin-1',
    });

    const history = await listPlanPrices({ planId: plan.id });
    expect(history).toHaveLength(2);
  });

  it('throws PlanNotFound for an unknown plan', async () => {
    await expect(listPlanPrices({ planId: 'does-not-exist' })).rejects.toThrow(PlanNotFound);
  });
});
