import { ROLE_CODES } from '@ctcj/shared';

const PRACTITIONER_ROLES = [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO];

/**
 * The one place clinical's infrastructure is allowed to know identity
 * exists for practitioner-eligibility checks. Imports identity's
 * application layer's new checkHasAnyRole primitive (added in this phase
 * alongside, not replacing, checkIsJugador), never identity's persistence.
 *
 * @param {{ checkHasAnyRole: (input: { userId: string, roleCodes: string[] }) => Promise<{ hasAnyRole: boolean }> }} deps
 * @returns {import('../../application/ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider}
 */
export function createIdentityPractitionerEligibilityProvider({ checkHasAnyRole }) {
  return {
    async isEligiblePractitioner(userId) {
      const { hasAnyRole } = await checkHasAnyRole({ userId, roleCodes: PRACTITIONER_ROLES });
      return hasAnyRole;
    },
  };
}
