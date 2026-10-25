import { randomUUID } from 'node:crypto';

import { del, put } from '@vercel/blob';

import { EXTENSION_BY_MIME_TYPE } from './localDiskAvatarStorage.js';

/**
 * Stores avatar images in Vercel Blob and returns the blob's public URL
 * (absolute, served by Vercel's CDN -- not by this app's /uploads mount).
 * Same naming rule as the local-disk adapter: a fresh randomUUID(), never
 * the client's filename.
 *
 * @param {{ token: string, putBlob?: typeof put, deleteBlob?: typeof del }} options
 *   `putBlob`/`deleteBlob` are injectable for unit tests; default to @vercel/blob's.
 * @returns {import('../../application/ports/AvatarStorage.js').AvatarStorage}
 */
export function createVercelBlobAvatarStorage({ token, putBlob = put, deleteBlob = del }) {
  return {
    async save(buffer, mimeType) {
      const extension = EXTENSION_BY_MIME_TYPE[mimeType];
      const blob = await putBlob(`avatars/${randomUUID()}.${extension}`, buffer, {
        access: 'public',
        contentType: mimeType,
        token,
      });
      return blob.url;
    },

    /** Deletes an avatar blob (only our own `avatars/` files). */
    async remove(url) {
      if (typeof url !== 'string' || !url.includes('/avatars/')) return;
      await deleteBlob(url, { token });
    },
  };
}
