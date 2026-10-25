import { isMinorByBirthDate } from '../../domain/policies/age.js';

/**
 * Who the notifications module may write to, for other modules (never
 * reachable via HTTP). Only active, non-deleted, non-demo accounts with a
 * verified email. A minor's emails go to their APPROVED guardians
 * (Ley 1581 de 2012, art. 7), so each contact carries them.
 *
 * @param {{ notificationDirectoryRepository: {
 *   findContacts: (userIds: string[]) => Promise<Array<{ id: string, email: string,
 *     firstName: string, lastName: string, birthDate: Date|null, emailVerified: boolean,
 *     guardians: Array<{ id: string, email: string, firstName: string, emailVerified: boolean }> }>>,
 *   listUserIds: (input: { clubId: string, scope: 'ALL'|'PLAYERS'|'GUARDIANS' }) => Promise<string[]>,
 * }, clock: { now: () => Date }, clubId: string }} deps
 */
export function createNotificationDirectory({ notificationDirectoryRepository, clock, clubId }) {
  return {
    /** @param {{ userIds: string[] }} input */
    async getNotificationContacts({ userIds }) {
      const unique = [...new Set(userIds)];
      if (unique.length === 0) return [];
      const rows = await notificationDirectoryRepository.findContacts(unique);
      const now = clock.now();
      return rows.map((row) => ({
        id: row.id,
        email: row.emailVerified ? row.email : null,
        firstName: row.firstName,
        lastName: row.lastName,
        isMinor: row.birthDate ? isMinorByBirthDate(row.birthDate, now) : false,
        guardians: row.guardians
          .filter((g) => g.emailVerified)
          .map((g) => ({ id: g.id, email: g.email, firstName: g.firstName })),
      }));
    },

    /** @param {{ scope: 'ALL'|'PLAYERS'|'GUARDIANS' }} input */
    async listNotifiableUserIds({ scope }) {
      return notificationDirectoryRepository.listUserIds({ clubId, scope });
    },
  };
}
