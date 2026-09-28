import { DomainError } from '../../domain/errors/DomainError.js';

export class DeletionRequestAlreadyOpen extends DomainError {
  constructor() {
    super(
      'deletion_request_already_open',
      'Ya tienes una solicitud de eliminación de cuenta en trámite.',
    );
  }
}
