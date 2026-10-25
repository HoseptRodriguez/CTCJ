import { COMMUNITY_MEDIA_LIMITS } from '@ctcj/shared';

import { startOfClubDay } from '../services/clubDay.js';

/**
 * What the composer should offer this player: whether they may attach
 * photos/videos at all (minors may not), how the video is uploaded, and how
 * many posts with media they have left today.
 *
 * @param {{
 *   minorStatusProvider: import('../ports/MinorStatusProvider.js').MinorStatusProvider,
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   mediaStorage: import('../ports/MediaStorage.js').MediaStorage,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createGetMediaCapabilities({
  minorStatusProvider,
  postRepository,
  mediaStorage,
  clock,
}) {
  /** @param {{ userId: string }} input */
  return async function getMediaCapabilities({ userId }) {
    const [isMinor, usedToday] = await Promise.all([
      minorStatusProvider.isMinor(userId),
      postRepository.countMediaPostsSince(userId, startOfClubDay(clock.now())),
    ]);
    return {
      canUploadMedia: !isMinor,
      isMinor,
      videoUpload: mediaStorage.mode === 'blob' ? 'direct' : 'server',
      remainingMediaPostsToday: Math.max(
        0,
        COMMUNITY_MEDIA_LIMITS.MAX_MEDIA_POSTS_PER_DAY - usedToday,
      ),
      limits: COMMUNITY_MEDIA_LIMITS,
    };
  };
}
