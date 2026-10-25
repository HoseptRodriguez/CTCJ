import { CommunityError } from './CommunityError.js';

/** More than MAX_MEDIA_POSTS_PER_DAY posts with photos/videos in one club day. */
export class DailyMediaLimitReached extends CommunityError {
  constructor() {
    super('daily_media_limit', 'Daily limit of posts with photos or videos reached.');
  }
}
