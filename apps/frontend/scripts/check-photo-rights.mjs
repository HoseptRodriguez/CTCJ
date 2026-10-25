// Fails (exit 1) when the site would publish a photo of a minor without the
// guardian's authorization, or a photo whose rights aren't registered in
// src/lib/photo-rights.js. Runs before every production build (npm run
// build) and from npm run legal:check.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PHOTO_RIGHTS, photoRightsProblems } from '../src/lib/photo-rights.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public', 'img', 'club');
const SRC_DIR = path.join(ROOT, 'src');
// Tests and the dev-only showcase never reach production.
const IGNORED = /(\.test\.[jt]sx?$)|([\\/]pages[\\/]dev[\\/])|([\\/]lib[\\/]photo-rights\.js$)/;

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? listFiles(full) : [full];
    }),
  );
  return nested.flat();
}

const published = [
  ...new Set(
    (await readdir(PUBLIC_DIR).catch(() => []))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .map((f) => f.replace(/-\d+\.(jpe?g|png|webp|avif)$/i, '')),
  ),
];

const knownNames = Object.keys(PHOTO_RIGHTS);
const referenced = new Set();
for (const file of await listFiles(SRC_DIR)) {
  if (!/\.(jsx?|json)$/.test(file) || IGNORED.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const name of knownNames) {
    if (new RegExp(`['"\`]${name}['"\`]`).test(text)) referenced.add(name);
  }
}

const problems = photoRightsProblems({ published, referenced: [...referenced] });
if (problems.length) {
  console.error('\nDerechos de imagen: no se puede publicar el sitio.\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nVer docs/LEGAL_PENDIENTES.md, sección 5.\n');
  process.exit(1);
}
console.log(`Derechos de imagen: ${published.length} fotos publicadas, todas permitidas.`);
