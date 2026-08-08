import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  challenge_not_found: 404,
  self_challenge_forbidden: 409,
  player_not_eligible: 409,
  challenge_already_pending: 409,
  invalid_challenge_state: 409,
};

export function mapChallengesError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
