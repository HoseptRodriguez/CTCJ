/**
 * The one place booking's infrastructure is allowed to know identity
 * exists. Imports identity's application layer (a plain use-case function),
 * never identity's persistence -- legal under .dependency-cruiser.js's
 * no-cross-module-persistence and application-no-infra rules.
 *
 * @param {{ getMembershipStatus: (input: { userId: string }) => Promise<{ status: string|null }> }} deps
 * @returns {import('../../application/ports/MembershipStatusProvider.js').MembershipStatusProvider}
 */
export function createIdentityMembershipStatusProvider({ getMembershipStatus }) {
  return {
    async getStatus(userId) {
      const { status } = await getMembershipStatus({ userId });
      return status;
    },
  };
}
