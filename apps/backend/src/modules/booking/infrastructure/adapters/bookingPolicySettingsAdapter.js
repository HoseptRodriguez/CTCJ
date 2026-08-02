// This exact key, and its boolean semantics, are hardcoded here -- the only
// place in the codebase that knows what this SystemSetting key means. A
// future policy (in any module) needs its own key and its own adapter like
// this one; never widen this adapter's meaning to cover something else.
const OVERDUE_BOOKING_BLOCK_KEY = 'booking.blockOnOverdueMembership';

/**
 * @param {{
 *   getSystemSetting: (input: { key: string }) => Promise<{ value: any }|null>,
 *   setSystemSetting: (input: { key: string, value: any, updatedByUserId: string }) => Promise<void>,
 *   clubId: string,
 * }} deps
 * @returns {import('../../application/ports/BookingPolicySettings.js').BookingPolicySettings}
 */
export function createIdentitySystemSettingBookingPolicy({ getSystemSetting, setSystemSetting }) {
  return {
    async isOverdueBookingBlockEnabled() {
      const setting = await getSystemSetting({ key: OVERDUE_BOOKING_BLOCK_KEY });
      return setting?.value === true; // absent, or any non-true value => false (safe default)
    },
    async setOverdueBookingBlockEnabled(enabled, updatedByUserId) {
      await setSystemSetting({
        key: OVERDUE_BOOKING_BLOCK_KEY,
        value: Boolean(enabled),
        updatedByUserId,
      });
    },
  };
}
