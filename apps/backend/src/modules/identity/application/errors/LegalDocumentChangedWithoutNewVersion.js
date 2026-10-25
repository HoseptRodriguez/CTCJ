import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * A legal text was edited but kept its version number. The stored version
 * is the proof of what people accepted, so a changed text must be a new one.
 */
export class LegalDocumentChangedWithoutNewVersion extends DomainError {
  constructor(docType, version) {
    super(
      'legal_document_changed_without_new_version',
      `The text of ${docType} v${version} changed: publish it as a new version.`,
    );
  }
}
