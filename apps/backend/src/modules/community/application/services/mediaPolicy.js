import { COMMUNITY_MEDIA_LIMITS } from '@ctcj/shared';

import { InvalidMedia } from '../errors/InvalidMedia.js';

const { MAX_POST_IMAGES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } =
  COMMUNITY_MEDIA_LIMITS;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];

// A little slack over 60 s: containers round the last frame.
const DURATION_TOLERANCE = 0.5;

/** Up to 4 photos OR 1 video; text is optional only when there is media. */
export function assertPostShape({ content, imageCount, hasVideo }) {
  if (imageCount > 0 && hasVideo) throw new InvalidMedia('images_and_video');
  if (imageCount > MAX_POST_IMAGES) throw new InvalidMedia('too_many_images');
  if (!content.trim() && imageCount === 0 && !hasVideo) throw new InvalidMedia('empty_post');
}

/** @param {{ sizeBytes: number, detectedType: string|null }} image */
export function assertImage({ sizeBytes, detectedType }) {
  if (!IMAGE_TYPES.includes(detectedType)) throw new InvalidMedia('unsupported_type');
  if (sizeBytes > MAX_IMAGE_BYTES) throw new InvalidMedia('image_too_large');
}

/** @param {{ sizeBytes: number, detectedType: string|null, durationSeconds: number|null }} video */
export function assertVideo({ sizeBytes, detectedType, durationSeconds }) {
  if (!VIDEO_TYPES.includes(detectedType)) throw new InvalidMedia('unsupported_type');
  if (sizeBytes > MAX_VIDEO_BYTES) throw new InvalidMedia('video_too_large');
  if (durationSeconds == null || durationSeconds > MAX_VIDEO_SECONDS + DURATION_TOLERANCE) {
    throw new InvalidMedia('video_too_long');
  }
}
