/** Names and emails of the people who asked, for the staff inbox. Fails open. */
export class PersonDirectory {
  /** @returns {Promise<Map<string, { firstName: string, lastName: string, email: string }>>} */
  async getSummaries(_userIds) {
    throw new Error('Not implemented');
  }
}
