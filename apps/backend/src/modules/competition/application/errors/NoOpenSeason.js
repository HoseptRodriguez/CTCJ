import { DomainError } from '../../domain/errors/DomainError.js';

/** Thrown by recordMatchForOpenSeason when the club has no OPEN season to
 * record into -- distinct from SeasonNotFound, which is about an explicit
 * seasonId that doesn't exist; this is about there being no *implicit*
 * one to fall back to. */
export class NoOpenSeason extends DomainError {
  constructor() {
    super('no_open_season', 'There is no open competition season right now.');
  }
}
