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

/** Never authorizes booking-for-others -- safe default, matches the others' fail-closed-to-self-only stance. */
export function createNullGuardianshipProvider() {
  return {
    async canBookFor() {
      return false;
    },
  };
}
