import { DomainError } from '../../domain/errors/DomainError.js';

export class ReservationNotFound extends DomainError {
  constructor() {
    super('reservation_not_found', 'Reservation not found.');
  }
}
