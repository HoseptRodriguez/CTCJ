/**
 * The one place tournament's infrastructure is allowed to know identity
 * exists for eligibility checks. Imports identity's application layer (a
 * plain use-case function), never identity's persistence -- legal under
 * .dependency-cruiser.js's no-cross-module-persistence and application-no-infra
 * rules, matching billing's/coaching's/competition's identical adapters.
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
