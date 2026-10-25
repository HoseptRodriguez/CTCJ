import { DomainError } from '../../domain/errors/DomainError.js';

export class InfoRequestNotFound extends DomainError {
  constructor() {
    super('info_request_not_found', 'No encontramos esa solicitud.');
  }
}
