import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  season_not_found: 404,
  season_already_open: 409,
  match_not_found: 404,
  player_not_eligible: 409,
  invalid_season_state: 409,
  invalid_match_state: 409,
  invalid_participant_count: 400,
  duplicate_participant: 400,
  invalid_winner_side: 400,
};

export function mapCompetitionError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
