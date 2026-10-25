// npm run legal:check -- blocks publishing the site (Parte 9).
//
// Fails (exit 1) while any legal page or the footer still has a
// [COMPLETAR ...] or [VERIFICAR ...] marker (also the program pages' content), or while a photo of a minor
// without the guardian's authorization would be published. It runs first
// in the production build (npm run build, used by Render), so the site
// can't go live until the club completes its data and a lawyer reviews the
// texts (docs/LEGAL_PENDIENTES.md).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MARKER = /\[(COMPLETAR|VERIFICAR)\b[^\]]*\]/g;

/** Every [COMPLETAR ...] / [VERIFICAR ...] in a text, in order. */
export function findMarkers(text) {
  return [...String(text).matchAll(MARKER)].map((m) => m[0]);
}

/**
 * @param {{
 *   documents: Array<{ type: string, title: string, path?: string|null }>,
 *   business: Record<string, unknown>,
 *   footerSources: Array<{ file: string, text: string }>,
 *   contentSources?: Array<{ file: string, text: string }>,
 * }} input
 * @returns {Array<{ where: string, markers: string[] }>}
 */
export function collectLegalProblems({ documents, business, footerSources, contentSources = [] }) {
  const problems = [];
  for (const doc of documents) {
    const markers = findMarkers(JSON.stringify(doc));
    if (markers.length) {
      problems.push({ where: `${doc.title}${doc.path ? ` (${doc.path})` : ''}`, markers });
    }
  }
  const businessMarkers = Object.entries(business).flatMap(([key, value]) =>
    findMarkers(value).map((m) => `${key}: ${m}`),
  );
  if (businessMarkers.length) {
    problems.push({
      where: 'Datos del negocio del pie de página (packages/shared/src/legal/business.js)',
      markers: businessMarkers,
    });
  }
  for (const { file, text } of footerSources) {
    const markers = findMarkers(text);
    if (markers.length) problems.push({ where: `Pie de página (${file})`, markers });
  }
  for (const { file, text } of contentSources) {
    const markers = findMarkers(text);
    if (markers.length) problems.push({ where: `Contenido de programas (${file})`, markers });
  }
  return problems;
}

async function main() {
  const shared = await import(
    pathToFileURL(path.join(ROOT, 'packages/shared/src/legal/index.js')).href
  );
  const footerFiles = [
    'apps/frontend/src/layout/Footer.jsx',
    'apps/frontend/src/layout/LegalLinks.jsx',
    // Social networks shown in the footer.
    'apps/frontend/src/lib/clubInfo.js',
  ];
  // Program pages: schedules, prices, ages, coaches... (never invented).
  const contentFiles = ['apps/frontend/src/lib/programs.js'];
  const problems = collectLegalProblems({
    documents: shared.LEGAL_DOCUMENTS,
    business: shared.BUSINESS,
    footerSources: footerFiles.map((file) => ({
      file,
      text: readFileSync(path.join(ROOT, file), 'utf8'),
    })),
    contentSources: contentFiles.map((file) => ({
      file,
      text: readFileSync(path.join(ROOT, file), 'utf8'),
    })),
  });

  let failed = false;
  if (problems.length) {
    failed = true;
    const total = problems.reduce((n, p) => n + p.markers.length, 0);
    console.error(
      `\nTextos legales: faltan ${total} datos o revisiones. El sitio no se puede publicar.\n`,
    );
    for (const p of problems) {
      console.error(`  ${p.where}`);
      for (const m of [...new Set(p.markers)]) console.error(`    - ${m}`);
    }
    console.error('\nVer docs/LEGAL_PENDIENTES.md.\n');
  } else {
    console.log('Textos legales: sin datos pendientes.');
  }

  const photos = spawnSync(
    process.execPath,
    [path.join(ROOT, 'apps/frontend/scripts/check-photo-rights.mjs')],
    { stdio: 'inherit' },
  );
  if (photos.status !== 0) failed = true;

  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
