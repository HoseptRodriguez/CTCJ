import { DomainError } from '../../domain/errors/DomainError.js';

/** The club turned off two-hour reservations (Configuración de reservas). */
export class SecondHourDisabled extends DomainError {
  constructor() {
    super('second_hour_disabled', 'Adding a second hour is turned off by the club.');
  }
}
