/**
 * Identifies a file by its CONTENT (magic bytes), never by its extension or
 * the type the browser declared -- a ".jpg" that is really something else is
 * rejected. Pure functions over a Buffer; no I/O.
 */

const ascii = (buf, start, end) => buf.subarray(start, end).toString('latin1');

// ISO-BMFF "ftyp" brands: HEIF/HEIC images vs MP4 video.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'M4V ',
  'M4VH',
  'M4VP',
  'dash',
  'mmp4',
  'msnv',
  'f4v ',
  'NDAS',
  'MSNV',
]);

/**
 * @param {Buffer} buf -- at least the first ~64 bytes of the file
 * @returns {'image/jpeg'|'image/png'|'image/webp'|'image/heic'|'video/mp4'|'video/webm'|null}
 */
export function detectFileType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return 'image/webp';

  if (ascii(buf, 4, 8) === 'ftyp') {
    const major = ascii(buf, 8, 12);
    // Compatible brands follow the minor version (bytes 12-16) up to the box size.
    const boxSize = Math.min(buf.readUInt32BE(0), buf.length);
    const brands = [major];
    for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(ascii(buf, i, i + 4));
    if (brands.some((b) => HEIC_BRANDS.has(b))) return 'image/heic';
    if (major === 'qt  ') return null; // QuickTime .mov: not accepted
    if (brands.some((b) => MP4_BRANDS.has(b))) return 'video/mp4';
    return null;
  }

  // Matroska/WebM: EBML header, with DocType "webm" near the start.
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return ascii(buf, 0, Math.min(buf.length, 64)).includes('webm') ? 'video/webm' : null;
  }
  return null;
}

/** MP4: duration from the movie header ("mvhd"), if it is within `buf`. */
function mp4Duration(buf) {
  const at = buf.indexOf('mvhd', 0, 'latin1');
  if (at < 4) return null;
  const version = buf[at + 4];
  const base = at + 8; // after "mvhd" + version/flags
  try {
    if (version === 1) {
      const timescale = buf.readUInt32BE(base + 16);
      const duration = Number(buf.readBigUInt64BE(base + 20));
      return timescale ? duration / timescale : null;
    }
    const timescale = buf.readUInt32BE(base + 8);
    const duration = buf.readUInt32BE(base + 12);
    return timescale ? duration / timescale : null;
  } catch {
    return null;
  }
}

/** WebM: Segment Info "Duration" (0x4489, float) x TimecodeScale (0x2AD7B1, default 1ms). */
function webmDuration(buf) {
  const at = buf.indexOf(Buffer.from([0x44, 0x89]));
  if (at < 0) return null;
  const sizeByte = buf[at + 2];
  let value;
  try {
    if (sizeByte === 0x88) value = buf.readDoubleBE(at + 3);
    else if (sizeByte === 0x84) value = buf.readFloatBE(at + 3);
    else return null;
  } catch {
    return null;
  }
  let scale = 1_000_000; // ns per tick
  const s = buf.indexOf(Buffer.from([0x2a, 0xd7, 0xb1]));
  if (s >= 0) {
    const len = buf[s + 3] & 0x0f; // size marker 0x8N -> N bytes
    if (len > 0 && len <= 6) scale = buf.readUIntBE(s + 4, len);
  }
  const seconds = (value * scale) / 1e9;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/**
 * Best-effort video duration from the file's own headers. Returns null when
 * the header isn't in `buf` (e.g. an MP4 with its index at the end); callers
 * then rely on the duration the browser measured, within the same limit.
 * @returns {number|null} seconds
 */
export function probeVideoDuration(buf, type) {
  if (type === 'video/mp4') return mp4Duration(buf);
  if (type === 'video/webm') return webmDuration(buf);
  return null;
}
