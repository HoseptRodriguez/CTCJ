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
}
