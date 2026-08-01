/**
 * @typedef {import('../../domain/entities/Reservation.js').Reservation} Reservation
 */

export class ReservationRepository {
  /**
   * Inserts a new HOLD reservation. Implementations must translate a
   * Postgres exclusion-constraint violation (double-booking) into
   * SlotNotAvailable -- optimistic-insert-and-catch, not check-then-insert,
   * to avoid a race under concurrency.
   * @returns {Promise<Reservation>}
   */
  async createHold(_reservation) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Reservation|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Occupying (HOLD/CONFIRMED) reservations for a club's court schedule over [dayStart, dayEnd). @returns {Promise<Reservation[]>} */
  async listOccupyingByClubAndDateRange(_clubId, _dayStart, _dayEnd) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<number>} count of the holder's current HOLD/CONFIRMED reservations. */
  async countOccupyingByHolder(_holderUserId) {
    throw new Error('Not implemented');
  }

  /**
   * Atomically transitions status only if the row is currently in one of
   * `fromStatuses` -- a 0 result means the row changed underneath the call
   * (e.g. the expiry job fired first), which the caller must handle.
   * @returns {Promise<number>} rows affected (0 or 1)
   */
  async transitionStatus({
    id: _id,
    fromStatuses: _fromStatuses,
    toStatus: _toStatus,
    extra: _extra,
  }) {
    throw new Error('Not implemented');
  }
}
