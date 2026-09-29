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
  account_not_active: 403,
  email_already_registered: 409,
  invalid_verification_token: 400,
  invalid_password_reset_token: 400,
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
  guardianship_not_approved: 409,
  outdated_policy_version: 409,
  guardianship_not_pending: 409,
  minor_needs_guardian: 403,
  unknown_authorization: 404,
  cannot_change_own_account: 409,
  account_anonymized: 409,
  email_already_verified: 409,
  role_already_assigned: 409,
  role_not_assigned: 409,
  mfa_code_invalid: 401,
  mfa_locked: 429,
  mfa_not_enabled: 409,
  mfa_already_enabled: 409,
  mfa_required_for_role: 409,
  mfa_setup_not_started: 409,
  invalid_mfa_token: 401,
  mfa_setup_required: 401,
  marketing_channel_required: 400,
};

export function mapIdentityError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
