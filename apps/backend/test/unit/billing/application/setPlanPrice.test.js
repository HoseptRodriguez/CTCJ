import { beforeEach, describe, expect, it } from 'vitest';

import { createSetPlanPrice } from '../../../../src/modules/billing/application/useCases/setPlanPrice.js';
import { createCancelScheduledPlanPrice } from '../../../../src/modules/billing/application/useCases/cancelScheduledPlanPrice.js';
import { createListPlans } from '../../../../src/modules/billing/application/useCases/listPlans.js';
import { createGenerateInvoice } from '../../../../src/modules/billing/application/useCases/generateInvoice.js';
import { createSetPriceNoticeDays } from '../../../../src/modules/billing/application/useCases/setPriceNoticeDays.js';
import { PlanNotFound } from '../../../../src/modules/billing/application/errors/PlanNotFound.js';
import { PriceStartTooEarly } from '../../../../src/modules/billing/application/errors/PriceStartTooEarly.js';
import { NoScheduledPrice } from '../../../../src/modules/billing/application/errors/NoScheduledPrice.js';
import { PriceNotPositive } from '../../../../src/modules/billing/domain/errors/PriceNotPositive.js';

import {
  createFakeAdjustmentRepository,
  createFakeAuditLog,
  createFakeBillingSettings,
  createFakeClock,
  createFakeInvoiceRepository,
  createFakeMembershipRepository,
  createFakeNotificationSender,
  createFakePlanRepository,
} from './fakes.js';

const CLUB_ID = 'club-1';
const ADMIN = { actorUserId: 'admin-1', actorRoles: ['ADMINISTRADOR'] };
const TODAY = '2026-03-05';
const day = (key) => new Date(`${key}T00:00:00Z`);

describe('changing a plan price', () => {
  let deps;
  let setPlanPrice;
  let plan;

  // A plan priced at 50.000 since January, with two active players and one
  // whose membership ended (not told about new prices).
  beforeEach(async () => {
    deps = {
      planRepository: createFakePlanRepository(),
      membershipRepository: createFakeMembershipRepository(),
      billingSettings: createFakeBillingSettings(30),
      notificationSender: createFakeNotificationSender(),
      auditLog: createFakeAuditLog(),
      clock: createFakeClock(new Date(`${TODAY}T15:00:00Z`)),
    };
    setPlanPrice = createSetPlanPrice(deps);
    plan = await deps.planRepository.create({
      clubId: CLUB_ID,
      code: 'INICIACION',
      name: 'Iniciación',
    });
    await deps.planRepository.supersedePrice(plan.id, {
      closePrevious: null,
      newRow: { basePriceCop: 50000, validFrom: day('2026-01-01') },
      createdBy: 'admin-1',
    });
    for (const playerId of ['ana', 'luis', 'ex']) {
      await deps.membershipRepository.create({
        playerId,
        planId: plan.id,
        startDate: day('2026-01-01'),
        billingDay: 5,
      });
    }
    const [, , exMembership] = await Promise.all(
      ['ana', 'luis', 'ex'].map(async (p) => (await deps.membershipRepository.listByPlayer(p))[0]),
    );
    exMembership.status = 'ENDED';
    await deps.membershipRepository.update(exMembership);
  });

  it('without a date, starts after the 30-day notice and tells every active player', async () => {
    const price = await setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN });

    expect(price).toMatchObject({
      basePriceCop: 60000,
      validFrom: day('2026-04-04'),
      activePlayers: 2,
      notifiedPlayers: 2,
    });
    expect(deps.notificationSender.sent.map((n) => n.recipientId).sort()).toEqual(['ana', 'luis']);
    expect(deps.notificationSender.sent[0]).toMatchObject({
      type: 'PLAN_PRICE_CHANGED',
      title: 'Nuevo precio del plan Iniciación',
    });
    expect(deps.notificationSender.sent[0].body).toMatch(/4 de abril de 2026/);
    expect(deps.notificationSender.sent[0].body).toMatch(/50\.000.*60\.000/);
  });

  it('refuses a start before the notice period, saying the earliest day', async () => {
    const attempt = setPlanPrice({
      planId: plan.id,
      basePriceCop: 60000,
      validFrom: day('2026-03-20'),
      ...ADMIN,
    });
    await expect(attempt).rejects.toThrow(PriceStartTooEarly);
    await expect(attempt).rejects.toMatchObject({ earliestValidFrom: '2026-04-04' });
    expect(deps.notificationSender.sent).toHaveLength(0);
  });

  it('the notice period is configurable', async () => {
    await createSetPriceNoticeDays(deps)({ days: 10, ...ADMIN });
    const price = await setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN });
    expect(price.validFrom).toEqual(day('2026-03-15'));
    expect(deps.auditLog.entries[0]).toMatchObject({
      action: 'PRICE_NOTICE_DAYS_CHANGED',
      before: { days: 30 },
      after: { days: 10 },
    });
  });

  it('invoices already issued keep their amount; a new one uses the price of its period', async () => {
    const invoiceRepository = createFakeInvoiceRepository();
    const generateInvoice = createGenerateInvoice({
      ...deps,
      adjustmentRepository: createFakeAdjustmentRepository(),
      invoiceRepository,
    });
    const [ana] = await deps.membershipRepository.listByPlayer('ana');
    const march = await generateInvoice({
      membershipId: ana.id,
      periodStart: day('2026-03-01'),
      periodEnd: day('2026-04-01'),
      dueDate: day('2026-03-10'),
    });

    await setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN }); // from 2026-04-04

    const april = await generateInvoice({
      membershipId: ana.id,
      periodStart: day('2026-04-01'),
      periodEnd: day('2026-05-01'),
      dueDate: day('2026-04-10'),
    });
    const may = await generateInvoice({
      membershipId: ana.id,
      periodStart: day('2026-05-01'),
      periodEnd: day('2026-06-01'),
      dueDate: day('2026-05-10'),
    });
    expect(Number((await invoiceRepository.findById(march.id)).amountCop)).toBe(50000);
    expect(Number(april.amountCop)).toBe(50000); // its period started before the new price
    expect(Number(may.amountCop)).toBe(60000);
  });

  it('only one change can wait at a time; cancelling it restores the price in effect', async () => {
    await setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN });
    await expect(
      setPlanPrice({ planId: plan.id, basePriceCop: 65000, ...ADMIN }),
    ).rejects.toMatchObject({ code: 'price_change_pending', pendingValidFrom: '2026-04-04' });

    const cancel = createCancelScheduledPlanPrice(deps);
    await expect(cancel({ planId: plan.id, ...ADMIN })).resolves.toMatchObject({
      currentPriceCop: 50000,
    });
    expect(await deps.planRepository.findCurrentPrice(plan.id)).toMatchObject({
      basePriceCop: 50000,
      validTo: null,
    });
    await expect(cancel({ planId: plan.id, ...ADMIN })).rejects.toThrow(NoScheduledPrice);
    await expect(
      setPlanPrice({ planId: plan.id, basePriceCop: 65000, ...ADMIN }),
    ).resolves.toMatchObject({ basePriceCop: 65000 });
    expect(deps.auditLog.entries.map((e) => e.action)).toEqual([
      'PLAN_PRICE_SET',
      'PLAN_PRICE_CANCELLED',
      'PLAN_PRICE_SET',
    ]);
  });

  it('a change is never dated in the past, even on a plan without players', async () => {
    const [ana] = await deps.membershipRepository.listByPlayer('ana');
    const [luis] = await deps.membershipRepository.listByPlayer('luis');
    for (const m of [ana, luis]) {
      m.status = 'ENDED';
      await deps.membershipRepository.update(m);
    }
    await expect(
      setPlanPrice({
        planId: plan.id,
        basePriceCop: 60000,
        validFrom: day('2026-03-04'),
        ...ADMIN,
      }),
    ).rejects.toThrow(PriceStartTooEarly);
    // Nobody has the plan now: the change can start today, and nobody is notified.
    await expect(
      setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN }),
    ).resolves.toMatchObject({ validFrom: day(TODAY), notifiedPlayers: 0 });
  });

  it("a plan's first price may be backdated (nothing was billed yet) and starts today by default", async () => {
    const fresh = await deps.planRepository.create({
      clubId: CLUB_ID,
      code: 'NUEVO',
      name: 'Nuevo',
    });
    await expect(
      setPlanPrice({
        planId: fresh.id,
        basePriceCop: 40000,
        validFrom: day('2026-01-01'),
        ...ADMIN,
      }),
    ).resolves.toMatchObject({ validFrom: day('2026-01-01'), notifiedPlayers: 0 });
    const other = await deps.planRepository.create({ clubId: CLUB_ID, code: 'OTRO', name: 'Otro' });
    await expect(
      setPlanPrice({ planId: other.id, basePriceCop: 40000, ...ADMIN }),
    ).resolves.toMatchObject({ validFrom: day(TODAY) });
  });

  it('a notification that fails does not undo the price change', async () => {
    deps.notificationSender = createFakeNotificationSender({ failFor: ['luis'] });
    const price = await createSetPlanPrice(deps)({
      planId: plan.id,
      basePriceCop: 60000,
      ...ADMIN,
    });
    expect(price.notifiedPlayers).toBe(1);
    expect(await deps.planRepository.findCurrentPrice(plan.id)).toMatchObject({
      basePriceCop: 60000,
    });
  });

  it.each([0, -5])('rejects a price of %s', async (basePriceCop) => {
    await expect(setPlanPrice({ planId: plan.id, basePriceCop, ...ADMIN })).rejects.toThrow(
      PriceNotPositive,
    );
  });

  it('throws PlanNotFound for an unknown plan', async () => {
    await expect(setPlanPrice({ planId: 'nope', basePriceCop: 1, ...ADMIN })).rejects.toThrow(
      PlanNotFound,
    );
  });

  it('the catalog shows the price in effect, the waiting change and the earliest start', async () => {
    await setPlanPrice({ planId: plan.id, basePriceCop: 60000, ...ADMIN });
    const [row] = await createListPlans({ ...deps, clubId: CLUB_ID })();
    expect(row).toMatchObject({
      currentPriceCop: 50000,
      scheduledPrice: { basePriceCop: 60000, validFrom: day('2026-04-04') },
      activePlayers: 2,
      earliestPriceStart: day('2026-04-04'),
      noticeDays: 30,
    });
  });
});
