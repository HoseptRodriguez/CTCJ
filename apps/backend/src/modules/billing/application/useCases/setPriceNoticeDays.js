/**
 * How many days in advance the players of a plan are told about a new price.
 * Only changes scheduled from now on use the new value.
 *
 * @param {{
 *   billingSettings: import('../ports/BillingSettings.js').BillingSettings,
 *   auditLog: import('../ports/BillingAuditLog.js').BillingAuditLog,
 * }} deps
 */
export function createSetPriceNoticeDays({ billingSettings, auditLog }) {
  /** @param {{ days: number, actorUserId: string, actorRoles?: string[] }} input */
  return async function setPriceNoticeDays({ days, actorUserId, actorRoles = [] }) {
    const before = await billingSettings.getPriceNoticeDays();
    await billingSettings.setPriceNoticeDays(days, actorUserId);
    if (before !== days) {
      await auditLog.record({
        actorUserId,
        actorRoles,
        action: 'PRICE_NOTICE_DAYS_CHANGED',
        entityType: 'SystemSetting',
        entityId: null,
        before: { days: before },
        after: { days },
      });
    }
    return { days };
  };
}
