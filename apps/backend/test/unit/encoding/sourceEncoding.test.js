import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Seeds, migrations and every user-facing text must be clean UTF-8: a file
 * saved as ANSI/Windows-1252, a replacement character (U+FFFD) or a
 * double-encoded accent ("Ã³" for "ó") ends up as broken text in the
 * database or on screen.
 */
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../..');
const SCANNED = [
  'apps/backend/prisma',
  'apps/backend/scripts',
  'apps/backend/src',
  'apps/frontend/src',
  'apps/frontend/index.html',
  'packages/shared/src',
];
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.sql',
  '.prisma',
  '.json',
  '.html',
  '.css',
  '.md',
]);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'uploads']);

// U+FFFD, and UTF-8 bytes read as Latin-1/Windows-1252: Ã + (¡..¿ or the
// C1 range), Â + ¡..¿, and â€ (curly quotes / dashes).
const DAMAGED = /\uFFFD|\u00C3[\u0080-\u00BF]|\u00C2[\u00A1-\u00BF]|\u00E2\u20AC/;
const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

function* textFiles(path) {
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch {
    if (TEXT_EXTENSIONS.has(extname(path))) yield path; // a single file
    return;
  }
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* textFiles(full);
    } else if (TEXT_EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

function findProblems() {
  const problems = [];
  for (const dir of SCANNED) {
    for (const file of textFiles(join(ROOT, dir))) {
      const name = relative(ROOT, file).replaceAll('\\', '/');
      const bytes = readFileSync(file);
      let text;
      try {
        text = strictUtf8.decode(bytes);
      } catch {
        problems.push(`${name}: no está guardado en UTF-8`);
        continue;
      }
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        problems.push(`${name}: tiene BOM`);
      }
      text.split('\n').forEach((line, i) => {
        if (DAMAGED.test(line)) problems.push(`${name}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
  }
  return problems;
}

describe('text encoding of seeds, migrations and the UI', () => {
  it('scans the real folders (the list is not accidentally empty)', () => {
    const count = SCANNED.reduce((n, dir) => n + [...textFiles(join(ROOT, dir))].length, 0);
    expect(count).toBeGreaterThan(300);
  });

  it('has no file outside UTF-8, no BOM, no "\\uFFFD" and no double-encoded accents', () => {
    expect(findProblems()).toEqual([]);
  });

  it('the detector does catch what it looks for', () => {
    expect(DAMAGED.test('Iniciaci\uFFFDn')).toBe(true);
    expect(DAMAGED.test('Iniciaci\u00C3\u00B3n')).toBe(true); // "IniciaciÃ³n"
    expect(DAMAGED.test('\u00C2\u00BFJugamos?')).toBe(true); // "Â¿Jugamos?"
    expect(DAMAGED.test('Iniciación · ¿Jugamos el sábado? Ñandú — «Ánimo»')).toBe(false);
  });
});
