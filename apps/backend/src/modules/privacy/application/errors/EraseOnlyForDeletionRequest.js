import { DomainError } from '../../domain/errors/DomainError.js';

export class EraseOnlyForDeletionRequest extends DomainError {
  constructor() {
    super(
      'erase_only_for_deletion_request',
      'Solo una solicitud de eliminación de cuenta, al responderla, puede eliminar la cuenta.',
    );
  }
}
