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
  second_hour_unavailable: 409,
  second_hour_disabled: 409,
  max_concurrent_reservations_exceeded: 409,
  reservation_already_paid: 409,
  reservation_has_no_price: 409,
  membership_overdue_booking_blocked: 403,
  not_authorized_to_book_for_user: 403,
  minor_pending_guardian_authorization: 403,
};

export function mapBookingError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    const httpError = new HttpError(status, err.code, err.message);
    // The UI names the hour that was taken ("La hora de 5:00 ya no está disponible").
    if (err.secondHourStart) httpError.details = { secondHourStart: err.secondHourStart };
    return httpError;
  }
  return err;
}
