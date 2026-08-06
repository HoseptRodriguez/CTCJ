import { ROLE_CODES } from '@ctcj/shared';

const PSYCHOLOGY_ROLES = [ROLE_CODES.PSICOLOGO, ROLE_CODES.NEUROPSICOLOGO];
const PHYSIOTHERAPY_ROLES = [ROLE_CODES.FISIOTERAPEUTA];

/**
 * The one place clinical's infrastructure is allowed to know identity
 * exists for practitioner-eligibility checks. Imports identity's
 * application layer's checkHasAnyRole primitive, never identity's
 * persistence. Resolves which discipline (PSYCHOLOGY|PHYSIOTHERAPY) the
 * practitioner belongs to -- checked as two independent role sets rather
 * than one combined list, since which set matched IS the discipline.
 *
 * @param {{ checkHasAnyRole: (input: { userId: string, roleCodes: string[] }) => Promise<{ hasAnyRole: boolean }> }} deps
 * @returns {import('../../application/ports/PractitionerEligibilityProvider.js').PractitionerEligibilityProvider}
 */
export function createIdentityPractitionerEligibilityProvider({ checkHasAnyRole }) {
  return {
    async getPractitionerEligibility(userId) {
      const [{ hasAnyRole: isPsychology }, { hasAnyRole: isPhysiotherapy }] = await Promise.all([
        checkHasAnyRole({ userId, roleCodes: PSYCHOLOGY_ROLES }),
        checkHasAnyRole({ userId, roleCodes: PHYSIOTHERAPY_ROLES }),
      ]);
      if (isPsychology) {
        return { eligible: true, discipline: 'PSYCHOLOGY' };
      }
      if (isPhysiotherapy) {
        return { eligible: true, discipline: 'PHYSIOTHERAPY' };
      }
      return { eligible: false, discipline: null };
    },
  };
}
