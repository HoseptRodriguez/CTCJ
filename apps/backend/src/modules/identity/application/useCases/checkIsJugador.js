import { ROLE_CODES } from '@ctcj/shared';

/**
 * Thin read used by billing's PlayerEligibilityProvider adapter (Phase 7) --
 * billing's application layer never sees the user repository directly, only
 * this single-purpose function. Mirrors canBookForMinor.js's fail-closed
 * shape: no throw for an unknown userId, just false.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createCheckIsJugador({ userRepository }) {
  /**
   * @param {{ userId: string }} input
   */
  return async function checkIsJugador({ userId }) {
    const user = await userRepository.findById(userId);
    return { isJugador: user?.hasRole(ROLE_CODES.JUGADOR) ?? false };
  };
}
