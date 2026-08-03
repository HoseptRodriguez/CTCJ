import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * v7's GlobalExceptionHandler equivalent: translates identity domain/application
 * errors (which never know about HTTP) into the status codes the API contract
 * promises. InvalidCredentials and AccountLockedError share the same code
 * ("invalid_credentials") by construction -- see those error classes -- so
 * they collapse to an identical response here without any extra logic.
 */
const STATUS_BY_CODE = {
  invalid_credentials: 401,
  self_assignment_forbidden: 403,
  email_not_verified: 403,
  email_already_registered: 409,
  invalid_verification_token: 400,
  invalid_refresh_token: 401,
  user_not_found: 404,
  membership_not_applicable: 409,
  already_jugador: 409,
  affiliation_request_already_pending: 409,
  affiliation_request_not_found: 404,
  affiliation_request_not_pending: 409,
  guardianship_already_exists: 409,
  guardianship_self_link_forbidden: 403,
  guardianship_not_found: 404,
  guardianship_not_pending: 409,
};

export function mapIdentityError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
