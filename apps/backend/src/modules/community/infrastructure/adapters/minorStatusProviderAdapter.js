/**
 * Community's view of identity's checkIsMinor use case (application layer
 * only, like playerEligibilityProviderAdapter.js).
 *
 * @param {{
 *   checkIsMinor: (input: { userId: string }) => Promise<{ isMinor: boolean }>,
 *   isPendingGuardianAuthorization: (input: { userId: string }) => Promise<boolean>,
 * }} deps
 * @returns {import('../../application/ports/MinorStatusProvider.js').MinorStatusProvider}
 */
export function createIdentityMinorStatusProvider({
  checkIsMinor,
  isPendingGuardianAuthorization,
}) {
  return {
    async isMinor(userId) {
      const { isMinor } = await checkIsMinor({ userId });
      return isMinor;
    },
    async isPendingGuardianAuthorization(userId) {
      return isPendingGuardianAuthorization({ userId });
    },
  };
}
