export const REPORT_TARGET_TYPE = Object.freeze({
  POST: 'POST',
  COMMENT: 'COMMENT',
});

export const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  DISMISSED: 'DISMISSED',
});

// --- Photos and videos in posts (2026-09-27) --------------------------------

export const POST_MEDIA_TYPE = Object.freeze({
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
});

/** A post carries up to MAX_POST_IMAGES photos OR one video (plus optional text). */
export const COMMUNITY_MEDIA_LIMITS = Object.freeze({
  MAX_POST_IMAGES: 4,
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,
  MAX_VIDEO_BYTES: 50 * 1024 * 1024,
  MAX_VIDEO_SECONDS: 60,
  // Photos are stored as WebP no wider/taller than this.
  MAX_IMAGE_EDGE: 1600,
  // Per player, per club day, posts that carry media.
  MAX_MEDIA_POSTS_PER_DAY: 10,
});

export const ALLOWED_IMAGE_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);
export const ALLOWED_VIDEO_TYPES = Object.freeze(['video/mp4', 'video/webm']);

/** A post is hidden automatically once it has this many pending reports. */
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

/** Preset report reason shown on every post (minor protection). */
export const MINOR_WITHOUT_CONSENT_REASON = 'Aparece un menor sin autorización';

export const POST_HIDDEN_REASON = Object.freeze({
  AUTO_REPORTS: 'AUTO_REPORTS',
  STAFF: 'STAFF',
});
