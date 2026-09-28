import { DomainError } from '../../domain/errors/DomainError.js';

/**
 * The next hour was taken (or held) by someone else before it could be
 * added. The first hour stays held, untouched.
 */
export class SecondHourUnavailable extends DomainError {
  /** @param {Date} secondHourStart */
  constructor(secondHourStart) {
    super(
      'second_hour_unavailable',
      'The next hour is no longer available; the first one is still held.',
    );
    this.secondHourStart = secondHourStart.toISOString();
  }
}
