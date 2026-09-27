/** Tiny sample files for media tests: only the bytes that identify each type. */
export const pad = (buf, n = 64) => Buffer.concat([buf, Buffer.alloc(Math.max(0, n - buf.length))]);

export function ftyp(major, compatible = []) {
  const size = 16 + compatible.length * 4;
  const box = Buffer.alloc(size);
  box.writeUInt32BE(size, 0);
  box.write('ftyp', 4, 'latin1');
  box.write(major, 8, 'latin1');
  compatible.forEach((b, i) => box.write(b, 16 + i * 4, 'latin1'));
  return box;
}

/** A minimal MP4 header with an "mvhd" of the given duration (seconds). */
export function mp4Header(seconds) {
  const mvhd = Buffer.alloc(32);
  mvhd.writeUInt32BE(32, 0);
  mvhd.write('mvhd', 4, 'latin1');
  mvhd.writeUInt8(0, 8); // version 0
  mvhd.writeUInt32BE(1000, 20); // timescale
  mvhd.writeUInt32BE(Math.round(seconds * 1000), 24); // duration
  return Buffer.concat([ftyp('isom', ['isom', 'mp41']), mvhd]);
}

export const jpegBytes = (size = 2048) => pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), size);
export const mp4Bytes = (seconds = 20, size = 4096) => pad(mp4Header(seconds), size);
/** A ".jpg" whose content is text -- must be rejected. */
export const fakeJpeg = () => Buffer.from('<html>no soy una foto</html> '.repeat(4));
