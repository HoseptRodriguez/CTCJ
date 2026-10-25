import { NOTIFICATION_TYPE } from '@ctcj/shared';

import { clubToday, earliestPriceStart, isScheduled } from '../../domain/services/priceSchedule.js';
import { supersedePrice } from '../../domain/services/supersedePrice.js';
import { PlanNotFound } from '../errors/PlanNotFound.js';
import { PriceChangePending } from '../errors/PriceChangePending.js';
import { PriceStartTooEarly } from '../errors/PriceStartTooEarly.js';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const longDate = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // prices are date-only, stored at 00:00 UTC
});

/**
 * Sets a plan's price from a given day on. Invoices already issued keep their
 * amount (they are frozen), and an invoice is always priced with the price in
 * effect on its period's start, so a new price only reaches future invoices.
 *
 * A change can't start in the past. When the plan has active players, the new one
 * can't start before the notice period (SystemSetting, 30 days by default)
 * and every one of those players gets a notification now. Only one change
 * can wait at a time: a second one needs the first cancelled.
 *
 * @param {{
 *   planRepository: import('../ports/PlanRepository.js').PlanRepository,
 *   membershipRepository: import('../ports/MembershipRepository.js').MembershipRepository,
 *   billingSettings: import('../ports/BillingSettings.js').BillingSettings,
 *   notificationSender: import('../ports/NotificationSender.js').NotificationSender,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createSetPlanPrice({
  planRepository,
  membershipRepository,
  billingSettings,
  notificationSender,
  auditLog,
  clock,
}) {
  /**
   * @param {{ planId: string, basePriceCop: number, validFrom?: Date,
   *   actorUserId: string, actorRoles?: string[] }} input
   */
  return async function setPlanPrice({
    planId,
    basePriceCop,
    validFrom,
    actorUserId,
    actorRoles = [],
  }) {
    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new PlanNotFound();
    }

    const today = clubToday(clock.now());
    const latest = await planRepository.findCurrentPrice(planId);
    if (isScheduled(latest, today)) {
      throw new PriceChangePending(latest.validFrom);
    }
    const playerIds = await membershipRepository.listActivePlayerIdsByPlan(planId);
    const noticeDays = await billingSettings.getPriceNoticeDays();
    const earliest = earliestPriceStart({
      today,
      hasCurrentPrice: latest != null,
      activePlayers: playerIds.length,
      noticeDays,
    });
    const startsOn = validFrom ?? earliest;
    // A first price may carry any date (no invoice exists yet that it could
    // alter, and it lets past periods be loaded); a change never goes back.
    if (latest && startsOn < earliest) {
      throw new PriceStartTooEarly(earliest);
    }

    const { closePrevious, newRow } = supersedePrice(latest, {
      basePriceCop,
      validFrom: startsOn,
    }); // throws InvalidPriceValidFrom / PriceNotPositive
    const price = await planRepository.supersedePrice(planId, {
      closePrevious,
      newRow,
      createdBy: actorUserId,
    });

    await auditLog.record({
      actorUserId,
      actorRoles,
      action: 'PLAN_PRICE_SET',
      entityType: 'MembershipPlan',
      entityId: planId,
      before: latest ? { basePriceCop: String(latest.basePriceCop) } : null,
      after: {
        basePriceCop: String(price.basePriceCop),
        validFrom: startsOn.toISOString().slice(0, 10),
        activePlayers: playerIds.length,
        noticeDays,
      },
    });

    // Only a change is announced; a plan's first price has nobody to warn.
    let notifiedPlayers = 0;
    if (latest) {
      const title = `Nuevo precio del plan ${plan.name}`;
      const body = `Desde el ${longDate.format(startsOn)} el plan pasa de ${cop.format(
        Number(latest.basePriceCop),
      )} a ${cop.format(Number(price.basePriceCop))} al mes. Las facturas ya emitidas no cambian.`;
      const results = await Promise.allSettled(
        playerIds.map((recipientId) =>
          notificationSender.notify({
            recipientId,
            type: NOTIFICATION_TYPE.PLAN_PRICE_CHANGED,
            title,
            body,
            linkPath: '/mi-ctcj',
          }),
        ),
      );
      notifiedPlayers = results.filter((r) => r.status === 'fulfilled').length;
    }

    return { ...price, activePlayers: playerIds.length, notifiedPlayers };
  };
}
