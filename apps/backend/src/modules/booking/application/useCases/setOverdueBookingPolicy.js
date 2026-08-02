/**
 * @param {{ bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings }} deps
 */
export function createSetOverdueBookingPolicy({ bookingPolicySettings }) {
  /**
   * @param {{ enabled: boolean, updatedByUserId: string }} input
   */
  return async function setOverdueBookingPolicy({ enabled, updatedByUserId }) {
    await bookingPolicySettings.setOverdueBookingBlockEnabled(enabled, updatedByUserId);
    return { enabled };
  };
}
