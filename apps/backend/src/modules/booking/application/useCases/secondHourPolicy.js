/**
 * Whether a held hour can take the next one too (club setting, on by default).
 * @param {{ bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings }} deps
 */
export function createSecondHourPolicyUseCases({ bookingPolicySettings }) {
  return {
    async getSecondHourPolicy() {
      return { enabled: await bookingPolicySettings.isSecondHourEnabled() };
    },
    /** @param {{ enabled: boolean, updatedByUserId: string }} input */
    async setSecondHourPolicy({ enabled, updatedByUserId }) {
      await bookingPolicySettings.setSecondHourEnabled(enabled, updatedByUserId);
      return { enabled };
    },
  };
}
