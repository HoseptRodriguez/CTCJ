import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlans } from '../../../../src/modules/billing/application/useCases/listPlans.js';
import { createListPlanPrices } from '../../../../src/modules/billing/application/useCases/listPlanPrices.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';

import {
  createFakeAuditLog,
  createFakeBillingSettings,
  createFakeClock,
  createFakeMembershipRepository,
  createFakePlanRepository,
  createFakePlayerDirectoryProvider,
  priceDepsFor,
} from './fakes.js';

const CLUB_ID = 'club-1';

describe('listPlans', () => {
  let planRepository;
  let listPlans;
  let createPlan;
  let setPlanPrice;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    listPlans = createListPlans({
      planRepository,
      membershipRepository: createFakeMembershipRepository(),
      billingSettings: createFakeBillingSettings(),
      clock: createFakeClock(),
      clubId: CLUB_ID,
    });
    createPlan = createCreatePlan({
      planRepository,
      auditLog: createFakeAuditLog(),
      clubId: CLUB_ID,
    });
    setPlanPrice = createSetPlanPrice(priceDepsFor(planRepository));
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

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    listPlanPrices = createListPlanPrices({
      planRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(),
      clock: createFakeClock(),
    });
    createPlan = createCreatePlan({
      planRepository,
      auditLog: createFakeAuditLog(),
      clubId: CLUB_ID,
    });
  });

  it('returns the full history, newest first: previous price, who changed it and its state', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    const seed = async (basePriceCop, validFrom, createdBy) => {
      const current = await planRepository.findCurrentPrice(plan.id);
      await planRepository.supersedePrice(plan.id, {
        closePrevious: current ? { id: current.id, validTo: new Date(validFrom) } : null,
        newRow: { basePriceCop, validFrom: new Date(validFrom) },
        createdBy,
      });
    };
    await seed(50000, '2026-01-01', 'admin-1');
    await seed(60000, '2026-03-01', 'admin-1');
    await seed(65000, '2026-04-01', 'admin-2'); // after "today" (2026-03-05)

    const listWithNames = createListPlanPrices({
      planRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(
        new Map([['admin-1', { firstName: 'Marta', lastName: 'Gómez' }]]),
      ),
      clock: createFakeClock(),
    });
    const history = await listWithNames({ planId: plan.id });

    expect(history.map((p) => [p.previousPriceCop, p.basePriceCop, p.state])).toEqual([
      [60000, 65000, 'SCHEDULED'],
      [50000, 60000, 'CURRENT'],
      [null, 50000, 'PAST'],
    ]);
    expect(history.map((p) => p.changedByName)).toEqual([null, 'Marta Gómez', 'Marta Gómez']);
  });

  it('throws PlanNotFound for an unknown plan', async () => {
    await expect(listPlanPrices({ planId: 'does-not-exist' })).rejects.toThrow(PlanNotFound);
  });
});
