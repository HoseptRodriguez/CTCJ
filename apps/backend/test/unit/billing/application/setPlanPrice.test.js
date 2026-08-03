import { beforeEach, describe, expect, it } from 'vitest';

import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';
import { InvalidPriceValidFrom } from '../../../../src/modules/billing/domain/errors/InvalidPriceValidFrom.js';
import { NegativePrice } from '../../../../src/modules/billing/domain/errors/NegativePrice.js';

import { createFakePlanRepository } from './fakes.js';

const CLUB_ID = 'club-1';

describe('setPlanPrice', () => {
  let planRepository;
  let setPlanPrice;
  let createPlan;

  beforeEach(() => {
    planRepository = createFakePlanRepository();
    setPlanPrice = createSetPlanPrice({ planRepository });
    createPlan = createCreatePlan({ planRepository, clubId: CLUB_ID });
  });

  it('sets the initial price on a plan with none', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    const price = await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });
    expect(price.basePriceCop).toBe(50000);
    expect(price.validTo).toBeNull();
  });

  it('supersedes an existing vigente price, closing the old one', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-01-01'),
      createdByUserId: 'admin-1',
    });
    const newPrice = await setPlanPrice({
      planId: plan.id,
      basePriceCop: 60000,
      validFrom: new Date('2026-03-01'),
      createdByUserId: 'admin-1',
    });

    const history = await planRepository.listPrices(plan.id);
    expect(history).toHaveLength(2);
    const old = history.find((p) => p.basePriceCop === 50000);
    expect(old.validTo).toEqual(new Date('2026-03-01'));
    expect(newPrice.validTo).toBeNull();
  });

  it('propagates InvalidPriceValidFrom from the domain rule', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await setPlanPrice({
      planId: plan.id,
      basePriceCop: 50000,
      validFrom: new Date('2026-03-01'),
      createdByUserId: 'admin-1',
    });
    await expect(
      setPlanPrice({
        planId: plan.id,
        basePriceCop: 60000,
        validFrom: new Date('2026-01-01'),
        createdByUserId: 'admin-1',
      }),
    ).rejects.toThrow(InvalidPriceValidFrom);
  });

  it('propagates NegativePrice from the domain rule', async () => {
    const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
    await expect(
      setPlanPrice({
        planId: plan.id,
        basePriceCop: -1,
        validFrom: new Date('2026-01-01'),
        createdByUserId: 'admin-1',
      }),
    ).rejects.toThrow(NegativePrice);
  });

  it('throws PlanNotFound for an unknown plan', async () => {
    await expect(
      setPlanPrice({
        planId: 'does-not-exist',
        basePriceCop: 50000,
        validFrom: new Date('2026-01-01'),
        createdByUserId: 'admin-1',
      }),
    ).rejects.toThrow(PlanNotFound);
  });
});
