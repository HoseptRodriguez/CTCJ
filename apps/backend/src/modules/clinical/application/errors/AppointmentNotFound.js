import { DomainError } from '../../domain/errors/DomainError.js';

export class AppointmentNotFound extends DomainError {
  constructor() {
    super('appointment_not_found', 'No appointment exists with that id.');
  }
}
