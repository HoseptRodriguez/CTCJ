import sharp from 'sharp';

import { InvalidAvatarFile } from '../../application/errors/InvalidAvatarFile.js';

const AVATAR_SIZE = 512;

/**
 * sharp-based AvatarImageProcessor: decodes the upload (a truncated or fake
 * file fails here and is rejected), crops it to a 512x512 square, rotates it
 * per its EXIF orientation and re-encodes it as WebP. sharp drops all
 * metadata (EXIF/GPS, ICC, XMP) unless told to keep it.
 *
 * @returns {import('../../application/ports/AvatarImageProcessor.js').AvatarImageProcessor}
 */
export function createSharpAvatarImageProcessor() {
  return {
    async process(buffer) {
      try {
        const output = await sharp(buffer, { failOn: 'error' })
          .rotate()
          .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
          .webp({ quality: 82 })
          .toBuffer();
        return { buffer: output, mimeType: 'image/webp' };
      } catch {
        throw new InvalidAvatarFile();
      }
    },
  };
}
