import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * Deletes a person's account by anonymizing it (supresión, Ley 1581 de
 * 2012): personal fields are replaced, the photo file is deleted, every
 * session is closed and the account can no longer sign in. What the law
 * requires to keep (invoices, clinical records, the proof of consents and
 * of the request itself) stays, linked to the anonymized row.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   refreshTokenRepository: import('../ports/RefreshTokenRepository.js').RefreshTokenRepository,
 *   avatarStorage: import('../ports/AvatarStorage.js').AvatarStorage,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createAnonymizeAccount({
  userRepository,
  refreshTokenRepository,
  avatarStorage,
  clock,
}) {
  /** @param {{ userId: string }} input */
  return async function anonymizeAccount({ userId }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UserNotFound();
    const avatarUrl = user.avatarUrl;
    const now = clock.now();
    await userRepository.anonymize(userId, now);
    await refreshTokenRepository.revokeAllForUser(userId);
    if (avatarUrl) {
      // The row no longer points to it; a failed delete must not undo the rest.
      await avatarStorage.remove?.(avatarUrl).catch(() => {});
    }
    return { userId, anonymizedAt: now };
  };
}
