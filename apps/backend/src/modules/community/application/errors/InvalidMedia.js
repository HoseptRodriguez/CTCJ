import { CommunityError } from './CommunityError.js';

/**
 * A photo or video that breaks a rule. `reason` becomes the error code
 * (media_<reason>) so the app can show a precise message, e.g.
 * media_video_too_large -> "El video pesa más de 50 MB...".
 *
 * Reasons: too_many_images, images_and_video, empty_post, image_too_large,
 * video_too_large, video_too_long, unsupported_type, unreadable_image,
 * video_not_owned.
 */
export class InvalidMedia extends CommunityError {
  constructor(reason) {
    super(`media_${reason}`, `Invalid media: ${reason}.`);
    this.reason = reason;
  }
}
