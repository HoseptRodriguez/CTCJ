/**
 * Stored versions of the legal texts (legal_documents). Append-only: no
 * update, no delete.
 *
 * @typedef {{ docType: string, version: string, publishedOn: Date, title: string,
 *   content: object, contentSha256: string }} LegalDocumentRow
 */
export class LegalDocumentRepository {
  /** @returns {Promise<LegalDocumentRow|null>} */
  async find(_docType, _version) {
    throw new Error('Not implemented');
  }

  /** @param {LegalDocumentRow} _row @returns {Promise<LegalDocumentRow>} */
  async insert(_row) {
    throw new Error('Not implemented');
  }
}
