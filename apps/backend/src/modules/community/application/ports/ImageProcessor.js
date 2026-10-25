/**
 * Decodes an uploaded photo for real and re-encodes it as WebP no larger than
 * `maxEdge`, applying EXIF orientation and dropping ALL metadata (EXIF,
 * including GPS location).
 */
export class ImageProcessor {
  /**
   * @returns {Promise<{ buffer: Buffer, width: number, height: number, contentType: 'image/webp' }>}
   * @throws when the file is not a readable image
   */
  async toWebp(_buffer, _maxEdge) {
    throw new Error('Not implemented');
  }
}
