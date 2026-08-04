import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  plan_not_found: 404,
  plan_code_already_exists: 409,
  membership_not_found: 404,
  player_not_eligible: 409,
  plan_not_active: 409,
  invalid_membership_status_transition: 409,
  invalid_price_valid_from: 409,
  negative_price: 400,
  membership_not_active: 409,
  plan_price_not_set: 409,
  invoice_already_exists: 409,
  invoice_not_found: 404,
  invalid_invoice_state: 409,
};

export function mapBillingError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
