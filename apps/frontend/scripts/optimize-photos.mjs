// Optimizes the club's official photos for the web (npm run photos).
//
// Reads every JPG/PNG photo in photos-src/fotos-club (not in git -- see the
// root .gitignore) and writes, for each one, WebP and JPG copies 480, 960
// and 1600 px wide into public/img/club/<name>-<width>.<ext>. A photo is
// never enlarged: when the original is narrower than a size, that size is
// replaced by the original width. All metadata is dropped (EXIF, including
// GPS location, ICC, XMP) -- sharp only keeps it when asked with
// withMetadata(), which this script never calls. Orientation is applied to
// the pixels first, so nothing appears rotated once EXIF is gone.
//
// It also writes src/components/ui/clubPhotoWidths.json ({ name: [widths] })
// so ClubPhoto only ever asks for sizes that exist on disk.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'photos-src', 'fotos-club');
const OUT_DIR = path.join(ROOT, 'public', 'img', 'club');
const MANIFEST = path.join(ROOT, 'src', 'components', 'ui', 'clubPhotoWidths.json');

const TARGET_WIDTHS = [480, 960, 1600];
// Logos are not photos -- they have their own assets in public/.
const SKIP = /^escudo/i;

function widthsFor(originalWidth) {
  const widths = TARGET_WIDTHS.filter((w) => w < originalWidth);
  if (widths.length < TARGET_WIDTHS.length) widths.push(originalWidth);
  return [...new Set(widths)];
}

const files = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f) && !SKIP.test(f));
if (files.length === 0) {
  console.error(`No hay fotos en ${SRC_DIR}`);
  process.exit(1);
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const manifest = {};
for (const file of files.sort()) {
  const name = path.parse(file).name;
  const input = path.join(SRC_DIR, file);
  const { width } = await sharp(input).metadata();
  const widths = widthsFor(width);
  for (const w of widths) {
    const base = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    await base
      .clone()
      .webp({ quality: 80 })
      .toFile(path.join(OUT_DIR, `${name}-${w}.webp`));
    await base
      .clone()
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(path.join(OUT_DIR, `${name}-${w}.jpg`));
  }
  manifest[name] = widths;
  console.log(`${name}: ${widths.join(', ')} px`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Listo: ${files.length} fotos en public/img/club`);
