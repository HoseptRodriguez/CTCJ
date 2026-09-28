import { createHash } from 'node:crypto';

import { legalDocumentContent } from '@ctcj/shared';

import { LegalDocumentChangedWithoutNewVersion } from '../errors/LegalDocumentChangedWithoutNewVersion.js';

export const sha256OfLegalDocument = (doc) =>
  createHash('sha256').update(legalDocumentContent(doc)).digest('hex');

/**
 * Stores every legal document version in force that isn't stored yet, with
 * the SHA-256 of its content. A stored version whose text no longer matches
 * is refused: an edited text must be published as a new version.
 *
 * @param {{ legalDocumentRepository: import('../ports/LegalDocumentRepository.js').LegalDocumentRepository }} deps
 */
export function createSyncLegalDocuments({ legalDocumentRepository }) {
  /** @param {{ documents: object[] }} input @returns {Promise<{ inserted: string[] }>} */
  return async function syncLegalDocuments({ documents }) {
    const inserted = [];
    for (const doc of documents) {
      const sha = sha256OfLegalDocument(doc);
      const stored = await legalDocumentRepository.find(doc.type, doc.version);
      if (stored) {
        if (stored.contentSha256 !== sha) {
          throw new LegalDocumentChangedWithoutNewVersion(doc.type, doc.version);
        }
        continue;
      }
      await legalDocumentRepository.insert({
        docType: doc.type,
        version: doc.version,
        publishedOn: new Date(`${doc.publishedOn}T00:00:00Z`),
        title: doc.title,
        content: JSON.parse(legalDocumentContent(doc)),
        contentSha256: sha,
      });
      inserted.push(`${doc.type} v${doc.version}`);
    }
    return { inserted };
  };
}
