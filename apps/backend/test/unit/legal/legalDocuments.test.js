import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS } from '@ctcj/shared';

import {
  createSyncLegalDocuments,
  sha256OfLegalDocument,
} from '../../../src/modules/identity/application/useCases/syncLegalDocuments.js';
import { LegalDocumentChangedWithoutNewVersion } from '../../../src/modules/identity/application/errors/LegalDocumentChangedWithoutNewVersion.js';

const manifest = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../../../packages/shared/src/legal/manifest.json', import.meta.url),
    ),
    'utf8',
  ),
);

describe('legal documents are versioned', () => {
  it.each(LEGAL_DOCUMENTS.map((d) => [d.type, d]))(
    '%s: its text matches the manifest -- editing a text means a new version',
    (type, doc) => {
      expect(manifest[type]).toEqual({
        version: doc.version,
        publishedOn: doc.publishedOn,
        sha256: sha256OfLegalDocument(doc),
      });
    },
  );

  it('every page document has a title, a date, a version and sections with content', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.title).toBeTruthy();
      expect(doc.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.version).toMatch(/^\d+$/);
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it('no page claims that the site complies with the law', () => {
    const all = JSON.stringify(LEGAL_DOCUMENTS).toLowerCase();
    for (const claim of ['cumple la ley', 'cumple con la ley', 'cumplimos la ley', '100% legal']) {
      expect(all).not.toContain(claim);
    }
  });
});

describe('syncLegalDocuments', () => {
  function repo() {
    const rows = new Map();
    return {
      rows,
      async find(type, version) {
        return rows.get(`${type}@${version}`) ?? null;
      },
      async insert(row) {
        rows.set(`${row.docType}@${row.version}`, row);
        return row;
      },
    };
  }
  const doc = {
    type: 'TERMS',
    version: '1',
    publishedOn: '2026-09-28',
    title: 'Términos',
    sections: [{ id: 'a', heading: 'A', blocks: [{ p: 'Texto' }] }],
  };

  it('stores each new version once, with its hash; running it again changes nothing', async () => {
    const legalDocumentRepository = repo();
    const sync = createSyncLegalDocuments({ legalDocumentRepository });
    expect(await sync({ documents: [doc] })).toEqual({ inserted: ['TERMS v1'] });
    expect(await sync({ documents: [doc] })).toEqual({ inserted: [] });
    expect(legalDocumentRepository.rows.get('TERMS@1').contentSha256).toBe(
      sha256OfLegalDocument(doc),
    );
  });

  it('refuses a stored version whose text changed; a new version is stored alongside', async () => {
    const sync = createSyncLegalDocuments({ legalDocumentRepository: repo() });
    await sync({ documents: [doc] });
    const edited = { ...doc, sections: [{ id: 'a', heading: 'A', blocks: [{ p: 'Otro texto' }] }] };
    await expect(sync({ documents: [edited] })).rejects.toThrow(
      LegalDocumentChangedWithoutNewVersion,
    );
    await expect(sync({ documents: [{ ...edited, version: '2' }] })).resolves.toEqual({
      inserted: ['TERMS v2'],
    });
  });
});
