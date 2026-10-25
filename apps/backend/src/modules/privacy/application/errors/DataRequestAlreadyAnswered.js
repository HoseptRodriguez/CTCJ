import { DomainError } from '../../domain/errors/DomainError.js';

export class DataRequestAlreadyAnswered extends DomainError {
  constructor() {
    super('data_request_already_answered', 'Esta solicitud ya fue respondida.');
  }
}
