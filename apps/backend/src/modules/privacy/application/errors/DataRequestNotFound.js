import { DomainError } from '../../domain/errors/DomainError.js';

export class DataRequestNotFound extends DomainError {
  constructor() {
    super('data_request_not_found', 'No encontramos esa solicitud.');
  }
}
