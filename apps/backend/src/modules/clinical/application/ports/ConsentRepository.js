/**
 * A player's authorizations over their own clinical data (e.g. letting the
 * club administration read their physiotherapy notes). Append-only: a
 * withdrawal sets revokedAt, a new grant is a new row.
 */
export class ConsentRepository {
  /** @returns {Promise<{id: string, grantedAt: Date}|null>} the active (not withdrawn) consent */
  async findActive(_playerId, _scope) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, grantedAt: Date, revokedAt: Date|null}|null>} newest row, active or not */
  async findLatest(_playerId, _scope) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, grantedAt: Date}>} */
  async grant(_playerId, _scope, _now) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<boolean>} true if an active consent was withdrawn */
  async revoke(_playerId, _scope, _now) {
    throw new Error('Not implemented');
  }
}
