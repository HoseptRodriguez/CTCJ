/**
 * The one place booking's infrastructure knows identity's minor rule
 * (application layer only, like guardianshipProviderAdapter.js).
 *
 * @param {{ isPendingGuardianAuthorization: (input: { userId: string }) => Promise<boolean> }} deps
 * @returns {import('../../application/ports/MinorAuthorizationProvider.js').MinorAuthorizationProvider}
 */
export function createIdentityMinorAuthorizationProvider({ isPendingGuardianAuthorization }) {
  return {
    async isPendingGuardianAuthorization(userId) {
      return isPendingGuardianAuthorization({ userId });
    },
  };
}
