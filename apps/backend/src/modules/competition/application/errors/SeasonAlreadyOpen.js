import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by createSeason when the club already has an OPEN season -- a
 * clean 409 instead of a raw unique-index violation, matching billing's
 * InvoiceAlreadyExists pre-check pattern. */
export class SeasonAlreadyOpen extends DomainError {
  constructor() {
    super('season_already_open', 'This club already has an open competition season.');
  }
}
