import { COMMUNITY_MEDIA_LIMITS } from '@ctcj/shared';

import { CommunityRulesNotAccepted } from '../errors/CommunityRulesNotAccepted.js';
import { DailyMediaLimitReached } from '../errors/DailyMediaLimitReached.js';
import { InvalidMedia } from '../errors/InvalidMedia.js';
import { MediaNotAllowedForMinor } from '../errors/MediaNotAllowedForMinor.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { VideoUploadUnavailable } from '../errors/VideoUploadUnavailable.js';
import { startOfClubDay } from '../services/clubDay.js';
import { VIDEO_TYPES } from '../services/mediaPolicy.js';

const { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, MAX_MEDIA_POSTS_PER_DAY } = COMMUNITY_MEDIA_LIMITS;
// A signed upload token is only good for a few minutes.
const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Before the browser uploads a video straight to Blob, the server decides
 * whether to sign it: the caller must be a player (not a minor), under the
 * daily limit, uploading an MP4/WebM of at most 50 MB / 60 s into their own
 * folder. Blob itself then enforces the type and the size it was signed
 * for; the real content type is checked again when the post is created.
 *
 * @param {{
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   minorStatusProvider: import('../ports/MinorStatusProvider.js').MinorStatusProvider,
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   mediaStorage: import('../ports/MediaStorage.js').MediaStorage,
 *   clock: import('../ports/Clock.js').Clock,
 *   communityRulesProvider?: import('../ports/CommunityRulesProvider.js').CommunityRulesProvider,
 * }} deps
 */
export function createAuthorizeVideoUpload({
  communityRulesProvider,
  playerEligibilityProvider,
  minorStatusProvider,
  postRepository,
  mediaStorage,
  clock,
}) {
  /**
   * @param {{ userId: string, pathname: string,
   *   request: { contentType: string, sizeBytes: number, durationSeconds: number } }} input
   * @returns {Promise<{ allowedContentTypes: string[], maximumSizeInBytes: number,
   *   validUntil: number, addRandomSuffix: boolean }>}
   */
  return async function authorizeVideoUpload({ userId, pathname, request }) {
    if (mediaStorage.mode !== 'blob') {
      throw new VideoUploadUnavailable();
    }
    if (!(await playerEligibilityProvider.isEligiblePlayer(userId))) {
      throw new PlayerNotEligible();
    }
    if (await minorStatusProvider.isMinor(userId)) {
      throw new MediaNotAllowedForMinor();
    }
    if (communityRulesProvider && !(await communityRulesProvider.hasAcceptedRules(userId))) {
      throw new CommunityRulesNotAccepted();
    }
    const now = clock.now();
    if (
      (await postRepository.countMediaPostsSince(userId, startOfClubDay(now))) >=
      MAX_MEDIA_POSTS_PER_DAY
    ) {
      throw new DailyMediaLimitReached();
    }
    if (!pathname.startsWith(`community/${userId}/`) || pathname.includes('..')) {
      throw new InvalidMedia('video_not_owned');
    }
    if (!VIDEO_TYPES.includes(request.contentType)) throw new InvalidMedia('unsupported_type');
    if (request.sizeBytes > MAX_VIDEO_BYTES) throw new InvalidMedia('video_too_large');
    if (request.durationSeconds > MAX_VIDEO_SECONDS) throw new InvalidMedia('video_too_long');

    return {
      allowedContentTypes: [request.contentType],
      maximumSizeInBytes: MAX_VIDEO_BYTES,
      validUntil: now.getTime() + TOKEN_TTL_MS,
      addRandomSuffix: true,
    };
  };
}
