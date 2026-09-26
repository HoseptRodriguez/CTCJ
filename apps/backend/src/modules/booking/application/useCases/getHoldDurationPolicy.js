/**
 * @param {{ bookingPolicySettings: import('../ports/BookingPolicySettings.js').BookingPolicySettings }} deps
 */
export function createGetHoldDurationPolicy({ bookingPolicySettings }) {
  return async function getHoldDurationPolicy() {
    return { minutes: await bookingPolicySettings.getHoldDurationMinutes() };
  };
}
