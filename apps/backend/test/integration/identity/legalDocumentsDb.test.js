import { afterAll, describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS } from '@ctcj/shared';

import { buildIdentityContainer } from '../../../src/modules/identity/infrastructure/compositionRoot.js';

import { prisma } from './testDb.js';

describe('legal_documents (real Postgres)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores every version in force with its hash, once; stored versions cannot be rewritten', async () => {
    const container = buildIdentityContainer();
    await container.syncLegalDocuments({ documents: LEGAL_DOCUMENTS });
    await container.syncLegalDocuments({ documents: LEGAL_DOCUMENTS }); // idempotent

    const stored = await prisma.legalDocument.findMany({ orderBy: { docType: 'asc' } });
    for (const doc of LEGAL_DOCUMENTS) {
      expect(
        stored.filter((r) => r.docType === doc.type && r.version === doc.version),
      ).toHaveLength(1);
    }
    await expect(
      prisma.legalDocument.update({ where: { id: stored[0].id }, data: { title: 'Otro' } }),
    ).rejects.toThrow();
  });
});
