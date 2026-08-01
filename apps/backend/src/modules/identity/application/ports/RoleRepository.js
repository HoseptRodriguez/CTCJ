/** Port for role reference-data lookups (roles table is seed data, not user-managed). */
export class RoleRepository {
  /** @returns {Promise<{id: string, code: string, selfAssignable: boolean, requiresMfa: boolean}|null>} */
  async findByCode(_code) {
    throw new Error('Not implemented');
  }
}
