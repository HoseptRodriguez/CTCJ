/**
 * The one place coaching's infrastructure is allowed to know identity
 * exists. Imports identity's application layer (a plain use-case function),
 * never identity's persistence -- legal under .dependency-cruiser.js's
 * no-cross-module-persistence and application-no-infra rules. Reuses
 * identity's existing checkIsJugador use case as-is (Phase 7) -- no new
 * identity code needed for this half.
 *
 * @param {{ checkIsJugador: (input: { userId: string }) => Promise<{ isJugador: boolean }> }} deps
 * @returns {import('../../application/ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider}
 */
export function createIdentityPlayerEligibilityProvider({ checkIsJugador }) {
  return {
    async isEligiblePlayer(userId) {
      const { isJugador } = await checkIsJugador({ userId });
      return isJugador;
    },
  };
}
