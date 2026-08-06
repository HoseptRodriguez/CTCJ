/**
 * General-purpose role-membership check, alongside (not replacing)
 * checkIsJugador.js's JUGADOR-specific shape -- used by modules that need
 * to check for a set of roles rather than one fixed role (Phase 14's
 * clinical module: a practitioner holds PSICOLOGO or NEUROPSICOLOGO).
 * Mirrors checkIsJugador's fail-closed shape: no throw for an unknown
 * userId, just false.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createCheckHasAnyRole({ userRepository }) {
  /** @param {{ userId: string, roleCodes: string[] }} input */
  return async function checkHasAnyRole({ userId, roleCodes }) {
    const user = await userRepository.findById(userId);
    const hasAnyRole = user ? roleCodes.some((code) => user.hasRole(code)) : false;
    return { hasAnyRole };
  };
}
