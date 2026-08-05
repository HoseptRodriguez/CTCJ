import { HttpError } from '../../../../shared/errors/httpError.js';
import { CoachingError } from '../../application/errors/CoachingError.js';

const STATUS_BY_CODE = {
  player_not_eligible: 409,
};

export function mapCoachingError(err) {
  if (err instanceof CoachingError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
