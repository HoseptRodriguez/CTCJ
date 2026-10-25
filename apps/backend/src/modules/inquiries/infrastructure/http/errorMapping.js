import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  info_request_not_found: 404,
  form_token_invalid: 400,
};

export function mapInquiriesError(err) {
  if (err instanceof DomainError) {
    return new HttpError(STATUS_BY_CODE[err.code] ?? 400, err.code, err.message);
  }
  return err;
}
