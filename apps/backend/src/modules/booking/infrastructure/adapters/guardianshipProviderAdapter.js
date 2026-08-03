/**
 * The one place booking's infrastructure is allowed to know identity
 * exists. Imports identity's application layer (a plain use-case function),
 * never identity's persistence -- legal under .dependency-cruiser.js's
 * no-cross-module-persistence and application-no-infra rules.
 *
 * @param {{ canBookForMinor: (input: { guardianUserId: string, minorUserId: string }) => Promise<{ canBook: boolean }> }} deps
 * @returns {import('../../application/ports/GuardianshipProvider.js').GuardianshipProvider}
 */
export function createIdentityGuardianshipProvider({ canBookForMinor }) {
  return {
    async canBookFor(creatorUserId, holderUserId) {
      const { canBook } = await canBookForMinor({
        guardianUserId: creatorUserId,
        minorUserId: holderUserId,
      });
      return canBook;
    },
  };
}
