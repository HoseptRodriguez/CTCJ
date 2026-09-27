/**
 * Billing's own settings (stored as SystemSettings by identity). Only the
 * adapter knows the key names.
 */
export class BillingSettings {
  /** @returns {Promise<number>} days the players of a plan are told in advance of a new price */
  async getPriceNoticeDays() {
    throw new Error('Not implemented');
  }

  /** @param {number} _days @param {string} _updatedByUserId */
  async setPriceNoticeDays(_days, _updatedByUserId) {
    throw new Error('Not implemented');
  }
}
