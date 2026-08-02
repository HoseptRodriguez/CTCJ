/**
 * @param {{ bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings }} deps
 */
export function createGetOverdueBookingPolicy({ bookingPolicySettings }) {
  return async function getOverdueBookingPolicy() {
    return { enabled: await bookingPolicySettings.isOverdueBookingBlockEnabled() };
  };
}
