/** Who can be notified (identity module), with the guardians of each minor. */
export class ContactDirectory {
  /** { userIds } -> [{ id, email|null, firstName, lastName, isMinor, guardians }] */
  async getNotificationContacts(_input) {
    throw new Error('Not implemented');
  }

  /** { scope: 'ALL'|'PLAYERS'|'GUARDIANS' } -> string[] */
  async listNotifiableUserIds(_input) {
    throw new Error('Not implemented');
  }
}
