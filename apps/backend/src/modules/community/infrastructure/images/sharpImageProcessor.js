import sharp from 'sharp';

/**
 * sharp-based ImageProcessor: decodes the photo (a fake or broken file
 * fails here), applies its EXIF orientation, fits it inside maxEdge x
 * maxEdge (never enlarging) and re-encodes it as WebP. sharp drops all
 * metadata (EXIF including GPS, ICC, XMP) unless asked to keep it.
 *
 * HEIC: decodes only if this machine's libvips has an HEVC decoder (the
 * stock sharp build doesn't); otherwise it's rejected as unreadable. The
 * browser normally converts to JPEG before uploading anyway.
 *
 * @returns {import('../../application/ports/ImageProcessor.js').ImageProcessor}
 */
export function createSharpImageProcessor() {
  return {
    async toWebp(buffer, maxEdge) {
      const { data, info } = await sharp(buffer, { failOn: 'error' })
        .rotate()
        .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      return { buffer: data, width: info.width, height: info.height, contentType: 'image/webp' };
    },
  };
}
