// The only place in the codebase that knows what this SystemSetting key
// means (same convention as booking's bookingPolicySettingsAdapter.js).
import { PRICE_CHANGE_NOTICE_DAYS } from '@ctcj/shared';

const PRICE_NOTICE_DAYS_KEY = 'billing.priceChangeNoticeDays';

/**
 * @param {{
 *   getSystemSetting: (input: { key: string }) => Promise<{ value: any }|null>,
 *   setSystemSetting: (input: { key: string, value: any, updatedByUserId: string }) => Promise<void>,
 * }} deps
 * @returns {import('../../application/ports/BillingSettings.js').BillingSettings}
 */
export function createIdentitySystemSettingBillingSettings({ getSystemSetting, setSystemSetting }) {
  return {
    async getPriceNoticeDays() {
      const setting = await getSystemSetting({ key: PRICE_NOTICE_DAYS_KEY });
      const days = setting?.value;
      // Absent or out of range (e.g. hand-edited) => the default, never "no notice".
      return Number.isInteger(days) &&
        days >= PRICE_CHANGE_NOTICE_DAYS.MIN &&
        days <= PRICE_CHANGE_NOTICE_DAYS.MAX
        ? days
        : PRICE_CHANGE_NOTICE_DAYS.DEFAULT;
    },
    async setPriceNoticeDays(days, updatedByUserId) {
      await setSystemSetting({ key: PRICE_NOTICE_DAYS_KEY, value: days, updatedByUserId });
    },
  };
}
