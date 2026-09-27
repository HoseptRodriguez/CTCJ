import { PRICE_CHANGE_NOTICE_DAYS } from '@ctcj/shared';

/**
 * Safe default so buildBillingContainer() still works standalone (e.g. in
 * tests) without requiring the cross-module wiring app.js normally supplies.
 * Fails closed -- never treats anyone as eligible when the module isn't wired.
 */
export function createNullPlayerEligibilityProvider() {
  return {
    async isEligiblePlayer() {
      return false;
    },
  };
}

/**
 * Safe default so buildBillingContainer() still works standalone without the
 * cross-module wiring app.js normally supplies. Fails open (empty map), not
 * closed -- this is display enrichment, not an authorization gate, so an
 * unwired module just shows invoices without player names rather than
 * blocking the whole list.
 */
export function createNullPlayerDirectoryProvider() {
  return {
    async getPlayerSummaries() {
      return new Map();
    },
  };
}

/**
 * Standalone default: the documented notice period (30 days), and nothing
 * stored -- app.js wires the real SystemSetting-backed adapter.
 */
export function createDefaultBillingSettings() {
  let noticeDays = PRICE_CHANGE_NOTICE_DAYS.DEFAULT;
  return {
    async getPriceNoticeDays() {
      return noticeDays;
    },
    async setPriceNoticeDays(days) {
      noticeDays = days;
    },
  };
}

/** Standalone default: price-change notices go nowhere when notifications isn't wired. */
export function createNullNotificationSender() {
  return {
    async notify() {},
  };
}
