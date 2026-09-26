import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { createSharpAvatarImageProcessor } from '../../../../src/modules/identity/infrastructure/images/sharpAvatarImageProcessor.js';
import { InvalidAvatarFile } from '../../../../src/modules/identity/application/errors/InvalidAvatarFile.js';

const processor = createSharpAvatarImageProcessor();

function photo({ width = 800, height = 600, exif } = {}) {
  let img = sharp({ create: { width, height, channels: 3, background: '#9EE67C' } }).jpeg();
  if (exif) img = img.withExif(exif);
  return img.toBuffer();
}

describe('sharpAvatarImageProcessor', () => {
  it('turns a real photo into a 512x512 WebP', async () => {
    const out = await processor.process(await photo());
    expect(out.mimeType).toBe('image/webp');
    const meta = await sharp(out.buffer).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 512, height: 512 });
  });

  it('removes EXIF metadata, including GPS location', async () => {
    const input = await photo({
      exif: {
        IFD0: { Make: 'Telefono' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '4/1 20/1 0/1' },
      },
    });
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processor.process(input);
    expect((await sharp(out.buffer).metadata()).exif).toBeUndefined();
  });

  it.each([
    [
      'a truncated JPEG (only the first bytes)',
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    ],
    ['text renamed as an image', Buffer.from('not an image')],
  ])('rejects %s', async (_label, buffer) => {
    await expect(processor.process(buffer)).rejects.toBeInstanceOf(InvalidAvatarFile);
  });
});
