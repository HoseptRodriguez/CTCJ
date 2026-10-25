import { describe, expect, it } from 'vitest';

import {
  detectFileType,
  probeVideoDuration,
} from '../../../../src/modules/community/domain/services/fileSniffing.js';
import { ftyp, mp4Header, pad } from '../mediaSamples.js';

describe('detectFileType (real type from the bytes, never the extension)', () => {
  it.each([
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    ['WebP', Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1'), 'image/webp'],
    ['HEIC', ftyp('heic', ['mif1', 'heic']), 'image/heic'],
    ['MP4', ftyp('isom', ['isom', 'avc1']), 'video/mp4'],
    [
      'WebM',
      Buffer.concat([
        Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
        Buffer.from('....B\u0082\u0084webm', 'latin1'),
      ]),
      'video/webm',
    ],
  ])('%s', (_name, bytes, expected) => {
    expect(detectFileType(pad(bytes))).toBe(expected);
  });

  it.each([
    ['text renamed to .jpg', Buffer.from('this is not really a photo at all')],
    ['a PDF', Buffer.from('%PDF-1.7 ...............')],
    ['a QuickTime .mov', ftyp('qt  ', ['qt  '])],
    [
      'Matroska that is not WebM',
      Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('matroska', 'latin1')]),
    ],
    ['too short', Buffer.from([0xff, 0xd8])],
  ])('rejects %s', (_name, bytes) => {
    expect(detectFileType(bytes.length < 12 ? bytes : pad(bytes))).toBeNull();
  });
});

describe('probeVideoDuration', () => {
  it('reads the MP4 movie header', () => {
    expect(probeVideoDuration(mp4Header(42.5), 'video/mp4')).toBeCloseTo(42.5);
  });

  it('returns null when the header is not in the bytes read', () => {
    expect(probeVideoDuration(pad(ftyp('isom', ['isom'])), 'video/mp4')).toBeNull();
  });
});
