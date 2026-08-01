import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  invalid_time_slot: 400,
  invalid_reservation_state: 409,
  hold_expired: 409,
  reservation_not_owned: 403,
  reservation_not_found: 404,
  court_not_found: 404,
  slot_not_available: 409,
  max_concurrent_reservations_exceeded: 409,
};

export function mapBookingError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
