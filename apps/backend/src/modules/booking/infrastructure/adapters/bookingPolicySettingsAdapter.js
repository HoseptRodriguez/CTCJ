// This exact key, and its boolean semantics, are hardcoded here -- the only
// place in the codebase that knows what this SystemSetting key means. A
// future policy (in any module) needs its own key and its own adapter like
// this one; never widen this adapter's meaning to cover something else.
import {
  DEFAULT_HOLD_DURATION_MINUTES,
  MAX_HOLD_DURATION_MINUTES,
  MIN_HOLD_DURATION_MINUTES,
} from '../../domain/policies/bookingPolicy.js';

const OVERDUE_BOOKING_BLOCK_KEY = 'booking.blockOnOverdueMembership';
const HOLD_DURATION_KEY = 'booking.holdDurationMinutes';

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
    async getHoldDurationMinutes() {
      const setting = await getSystemSetting({ key: HOLD_DURATION_KEY });
      const minutes = setting?.value;
      // Absent or out of range (e.g. hand-edited) => the default, never a broken hold.
      return Number.isInteger(minutes) &&
        minutes >= MIN_HOLD_DURATION_MINUTES &&
        minutes <= MAX_HOLD_DURATION_MINUTES
        ? minutes
        : DEFAULT_HOLD_DURATION_MINUTES;
    },
    async setHoldDurationMinutes(minutes, updatedByUserId) {
      await setSystemSetting({ key: HOLD_DURATION_KEY, value: minutes, updatedByUserId });
    },
  };
}
