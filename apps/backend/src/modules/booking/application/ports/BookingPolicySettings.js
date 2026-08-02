/**
 * Single-purpose policy port -- deliberately NOT a generic settings
 * key/value interface. Booking's application layer never sees identity's
 * generic SystemSettingRepository; it only sees this one boolean question.
 * A future module needing its own club-configurable policy gets its own
 * equally narrow port, never this one and never the generic one directly --
 * see the Phase 5 plan for why (ADR-0006: payment status must never gate
 * sporting or clinical data, so the mechanism itself must not generalize).
 */
export class BookingPolicySettings {
  /** @returns {Promise<boolean>} */
  async isOverdueBookingBlockEnabled() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<void>} */
  async setOverdueBookingBlockEnabled(_enabled, _updatedByUserId) {
    throw new Error('Not implemented');
  }
}
