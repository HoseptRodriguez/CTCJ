/**
 * Turns an uploaded file into the avatar the club stores. Must decode the
 * image for real (never trust the declared type or the first bytes), strip
 * its metadata (EXIF, including GPS location) and normalize its size.
 */
export class AvatarImageProcessor {
  /**
   * @param {Buffer} _buffer
   * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
   * @throws {import('../errors/InvalidAvatarFile.js').InvalidAvatarFile} when it isn't a readable image
   */
  async process(_buffer) {
    throw new Error('Not implemented');
  }
}
