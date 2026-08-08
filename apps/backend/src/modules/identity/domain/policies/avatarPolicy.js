export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Defense-in-depth: multer's own fileFilter/limits already reject at the
 * HTTP boundary, but the use case checks again so it stays correct even if
 * invoked a different way later. */
export function isAllowedAvatarMimeType(mimeType) {
  return ALLOWED_AVATAR_MIME_TYPES.includes(mimeType);
}
