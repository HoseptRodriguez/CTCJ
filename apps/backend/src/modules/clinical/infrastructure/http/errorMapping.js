import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  appointment_not_found: 404,
  player_not_eligible: 409,
  practitioner_not_eligible: 409,
  practitioner_time_conflict: 409,
  invalid_appointment_state: 409,
  recovery_plan_not_found: 404,
  invalid_recovery_plan_state: 409,
  medical_history_entry_not_found: 404,
  invalid_medical_history_entry_state: 409,
  discipline_mismatch: 409,
};

export function mapClinicalError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
