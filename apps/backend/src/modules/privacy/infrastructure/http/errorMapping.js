import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  data_request_not_found: 404,
  data_request_already_answered: 409,
  erase_only_for_deletion_request: 409,
  deletion_request_already_open: 409,
};

export function mapPrivacyError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
