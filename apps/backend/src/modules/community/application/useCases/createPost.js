import { randomUUID } from 'node:crypto';

import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';

/**
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createCreatePost({ postRepository, playerEligibilityProvider, clock }) {
  /** @param {{ authorUserId: string, content: string }} input */
  return async function createPost({ authorUserId, content }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(authorUserId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }

    return postRepository.create({
      id: randomUUID(),
      authorId: authorUserId,
      content,
      createdAt: clock.now(),
    });
  };
}
