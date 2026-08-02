/**
 * Safe defaults so buildBookingContainer() still works standalone (e.g. in
 * tests) without requiring the cross-module wiring app.js normally supplies.
 * Both fail open to "never blocks" -- consistent with the policy's own
 * documented safe/permissive default.
 */

export function createNullMembershipStatusProvider() {
  return {
    async getStatus() {
      return null;
    },
  };
}

export function createStaticBookingPolicySettings(enabled = false) {
  return {
    async isOverdueBookingBlockEnabled() {
      return enabled;
    },
    async setOverdueBookingBlockEnabled() {
      throw new Error('Static policy adapter is read-only.');
    },
  };
}
