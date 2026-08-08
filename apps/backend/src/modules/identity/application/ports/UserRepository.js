/**
 * @typedef {import('../../domain/entities/User.js').User} User
 */

/**
 * Port for identity persistence. Implementations live in
 * infrastructure/persistence and must never be imported by domain/application.
 */
export class UserRepository {
  /** @returns {Promise<User|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<User|null>} */
  async findByEmail(_clubId, _email) {
    throw new Error('Not implemented');
  }

  /**
   * Batch lookup for display purposes only -- returns lightweight summary
   * rows, not full domain User entities (no role codes resolved), since
   * callers like getUserSummaries.js only need name/email. Unknown ids are
   * silently omitted, not an error.
   * @returns {Promise<{id: string, firstName: string, lastName: string, email: string}[]>}
   */
  async findByIds(_ids) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<boolean>} */
  async existsByEmail(_clubId, _email) {
    throw new Error('Not implemented');
  }

  /** Persists a brand-new user together with its initial role grant(s). @returns {Promise<User>} */
  async create(_user) {
    throw new Error('Not implemented');
  }

  /** Persists changes to a user's own scalar fields (not role grants). @returns {Promise<User>} */
  async update(_user) {
    throw new Error('Not implemented');
  }

  /** Inserts a new user_roles grant row. @returns {Promise<void>} */
  async addRoleGrant(_userId, _roleCode, _grantedByUserId) {
    throw new Error('Not implemented');
  }

  /**
   * Admin Dashboard support: club-wide JUGADOR count by membership_status,
   * including JUGADORs with no status set yet (key "NONE"). No new entity --
   * a grouped count over the existing membership_status column.
   * @returns {Promise<{ACTIVE: number, PENDING: number, OVERDUE: number, INACTIVE: number, SUSPENDED: number, NONE: number}>}
   */
  async countPlayersByMembershipStatus(_clubId) {
    throw new Error('Not implemented');
  }
}
