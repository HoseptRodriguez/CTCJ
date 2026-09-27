/**
 * Where post photos/videos live. Vercel Blob in production; local disk when
 * no Blob token is configured (development and tests).
 *
 * Every file a player uploads lives under `community/<userId>/`, which is
 * how ownership of a client-uploaded video is checked.
 */
export class MediaStorage {
  /** 'blob' (browser uploads videos straight to Blob) | 'local' (videos go through the server). */
  get mode() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<string>} public URL */
  async save(_key, _buffer, _contentType) {
    throw new Error('Not implemented');
  }

  /** True if `url` is a file this storage holds under `community/<userId>/`. */
  ownsUrl(_url, _userId) {
    throw new Error('Not implemented');
  }

  /**
   * Size, and the first `bytes` of a stored file (to check its real type).
   * @returns {Promise<{ sizeBytes: number, head: Buffer }|null>} null if it doesn't exist
   */
  async inspect(_url, _bytes) {
    throw new Error('Not implemented');
  }

  /** Best effort; never throws. @param {string[]} _urls */
  async deleteMany(_urls) {
    throw new Error('Not implemented');
  }
}
