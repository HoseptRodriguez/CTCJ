export class PasswordHasher {
  /** @returns {Promise<string>} */
  async hash(_plainPassword) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<boolean>} */
  async verify(_plainPassword, _hash) {
    throw new Error('Not implemented');
  }
}
