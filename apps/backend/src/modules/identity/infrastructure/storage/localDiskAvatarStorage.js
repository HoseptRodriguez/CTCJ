import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Writes avatar images to local disk under `uploadsDir` and returns a URL
 * served by app.js's `express.static` mount at `publicPath`. Files are
 * named with a fresh randomUUID(), never the client's filename, ruling out
 * path traversal and collisions.
 *
 * Local-disk storage doesn't survive a container redeploy or scale past one
 * instance -- an accepted trade-off for where this project is today (see
 * the Phase 2 plan), not a hidden limitation.
 *
 * @param {{ uploadsDir: string, publicPath: string }} options
 * @returns {import('../../application/ports/AvatarStorage.js').AvatarStorage}
 */
export function createLocalDiskAvatarStorage({ uploadsDir, publicPath }) {
  return {
    async save(buffer, mimeType) {
      const extension = EXTENSION_BY_MIME_TYPE[mimeType];
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(path.join(uploadsDir, filename), buffer);
      return `${publicPath}/${filename}`;
    },
  };
}
