/**
 * @param {{ bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings }} deps
 */
export function createSetHoldDurationPolicy({ bookingPolicySettings }) {
  /**
   * Applies to holds created from now on; existing holds keep their own
   * holdExpiresAt.
   * @param {{ minutes: number, updatedByUserId: string }} input
   */
  return async function setHoldDurationPolicy({ minutes, updatedByUserId }) {
    await bookingPolicySettings.setHoldDurationMinutes(minutes, updatedByUserId);
    return { minutes };
  };
}
