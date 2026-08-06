import { HttpError } from '../../../../shared/errors/httpError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const STATUS_BY_CODE = {
  tournament_not_found: 404,
  participant_not_found: 404,
  match_not_found: 404,
  player_not_eligible: 409,
  player_already_registered: 409,
  participant_count_mismatch: 400,
  match_not_ready: 409,
  match_already_recorded: 409,
  invalid_tournament_state: 409,
  not_enough_participants: 409,
  invalid_winner_participant: 400,
};

export function mapTournamentError(err) {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    return new HttpError(status, err.code, err.message);
  }
  return err;
}
