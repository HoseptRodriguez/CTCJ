import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { put } from '@vercel/blob';
import sharp from 'sharp';

import { NotificationsError } from '../../application/errors/NotificationsError.js';

export class InvalidAnnouncementImage extends NotificationsError {
  constructor() {
    super('invalid_announcement_image', 'The file is not a valid image');
  }
}

// apps/backend/src/modules/notifications/infrastructure/storage -> apps/backend/uploads/announcements
const UPLOADS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../uploads/announcements',
);

/**
 * Announcement images: decoded and re-encoded as WebP (a fake or broken
 * file fails here), at most 1200 px wide, rotated per EXIF and WITHOUT any
 * metadata (sharp drops EXIF/GPS unless told otherwise). Vercel Blob when a
 * token is configured (production), local disk otherwise.
 *
 * @param {{ blobToken?: string }} options
 * @returns {import('../../application/ports/ImageStorage.js').ImageStorage & { process: Function }}
 */
export function createAnnouncementImageStorage({ blobToken = '' } = {}) {
  return {
    async process(buffer) {
      try {
        return await sharp(buffer, { failOn: 'error' })
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        throw new InvalidAnnouncementImage();
      }
    },

    async save(buffer) {
      const name = `${randomUUID()}.webp`;
      if (blobToken) {
        const blob = await put(`announcements/${name}`, buffer, {
          access: 'public',
          contentType: 'image/webp',
          token: blobToken,
        });
        return blob.url;
      }
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(UPLOADS_DIR, name), buffer);
      return `/uploads/announcements/${name}`;
    },
  };
}
