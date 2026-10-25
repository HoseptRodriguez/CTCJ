import { CommunityError } from './CommunityError.js';

/** Minors' accounts can post text only -- never photos or videos. */
export class MediaNotAllowedForMinor extends CommunityError {
  constructor() {
    super('minor_media_not_allowed', 'Accounts of minors cannot upload photos or videos.');
  }
}
