import { beforeEach, describe, expect, it } from 'vitest';

import { createGenerateInvoice } from '../../../../src/modules/billing/application/useCases/generateInvoice.js';
import { createCreatePlan } from '../../../../src/modules/billing/application/useCases/createPlan.js';
import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { MembershipNotFound } from '../../../../src/modules/billing/application/errors/MembershipNotFound.js';
import { MembershipNotActive } from '../../../../src/modules/billing/application/errors/MembershipNotActive.js';
import { PlanPriceNotSet } from '../../../../src/modules/billing/application/errors/PlanPriceNotSet.js';
import { InvoiceAlreadyExists } from '../../../../src/modules/billing/application/errors/InvoiceAlreadyExists.js';

import {
  createFakePlanRepository,
  createFakeMembershipRepository,
  createFakeAdjustmentRepository,
  createFakeInvoiceRepository,
  createFakeClock,
} from './fakes.js';

const CLUB_ID = 'club-1';

function buildDeps() {
  return {
    planRepository: createFakePlanRepository(),
    membershipRepository: createFakeMembershipRepository(),
    adjustmentRepository: createFakeAdjustmentRepository(),
    invoiceRepository: createFakeInvoiceRepository(),
    clock: createFakeClock(),
  };
}

async function seedPricedPlanAndMembership(deps, { billingDay = 5 } = {}) {
  const createPlan = createCreatePlan({ planRepository: deps.planRepository, clubId: CLUB_ID });
  const setPlanPrice = createSetPlanPrice({ planRepository: deps.planRepository });

  const plan = await createPlan({ code: 'INICIACION', name: 'Iniciación' });
  await setPlanPrice({
    planId: plan.id,
    basePriceCop: 100000,
    validFrom: new Date('2026-01-01'),
    createdByUserId: 'admin-1',
  });
  const membership = await deps.membershipRepository.create({
    playerId: 'player-1',
    planId: plan.id,
    startDate: new Date('2026-01-01'),
    billingDay,
    frequency: 'MONTHLY',
  });

  return { plan, membership };
}

describe('generateInvoice', () => {
  let deps;
  let generateInvoice;

  beforeEach(() => {
    deps = buildDeps();
    generateInvoice = createGenerateInvoice(deps);
  });

  it('happy path: freezes the plan price into an invoice with a line', async () => {
    const { membership } = await seedPricedPlanAndMembership(deps);

    const invoice = await generateInvoice({
      membershipId: membership.id,
      periodStart: new Date('2026-03-01'),
      periodEnd: new Date('2026-04-01'),
      dueDate: new Date('2026-03-05'),
      generatedByUserId: 'admin-1',
    });

    expect(invoice.status).toBe('PENDING');
    expect(invoice.amountCop).toBe(100000n);
    expect(invoice.lines).toHaveLength(1);
  });

  it('throws MembershipNotFound for an unknown membership', async () => {
    await expect(
      generateInvoice({
        membershipId: 'does-not-exist',
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-04-01'),
        dueDate: new Date('2026-03-05'),
      }),
    ).rejects.toThrow(MembershipNotFound);
  });

  it('throws MembershipNotActive for a SUSPENDED/ENDED membership', async () => {
    const { membership } = await seedPricedPlanAndMembership(deps);
    const stored = await deps.membershipRepository.findById(membership.id);
    stored.suspend();
    await deps.membershipRepository.update(stored);

    await expect(
      generateInvoice({
        membershipId: membership.id,
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-04-01'),
        dueDate: new Date('2026-03-05'),
      }),
    ).rejects.toThrow(MembershipNotActive);
  });

  it('throws PlanPriceNotSet when the plan has no vigente price', async () => {
    const createPlan = createCreatePlan({ planRepository: deps.planRepository, clubId: CLUB_ID });
    const plan = await createPlan({ code: 'SIN_PRECIO', name: 'Sin precio' });
    const membership = await deps.membershipRepository.create({
      playerId: 'player-1',
      planId: plan.id,
      startDate: new Date('2026-01-01'),
      billingDay: 5,
      frequency: 'MONTHLY',
    });

    await expect(
      generateInvoice({
        membershipId: membership.id,
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-04-01'),
        dueDate: new Date('2026-03-05'),
      }),
    ).rejects.toThrow(PlanPriceNotSet);
  });

  it('throws InvoiceAlreadyExists for a duplicate membership+period', async () => {
    const { membership } = await seedPricedPlanAndMembership(deps);
    const input = {
      membershipId: membership.id,
      periodStart: new Date('2026-03-01'),
      periodEnd: new Date('2026-04-01'),
      dueDate: new Date('2026-03-05'),
    };

    await generateInvoice(input);
    await expect(generateInvoice(input)).rejects.toThrow(InvoiceAlreadyExists);
  });
});
