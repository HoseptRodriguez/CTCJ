import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * A player's optional play style (dominant hand, backhand), for the coaches'
 * player card. Only these two fields: nothing else of the profile.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createGetPlayerPlayStyle({ userRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getPlayerPlayStyle({ playerId }) {
    const user = await userRepository.findById(playerId);
    if (!user) {
      throw new UserNotFound();
    }
    return { id: user.id, dominantHand: user.dominantHand, backhand: user.backhand };
  };
}
