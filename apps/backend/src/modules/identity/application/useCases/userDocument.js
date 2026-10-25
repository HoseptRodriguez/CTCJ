import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * The player's identity document, handled only by staff (reception) and only
 * when needed: an electronic invoice in the player's name or a league
 * tournament registration. Never part of the public sign-up.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createUserDocumentUseCases({ userRepository }) {
  async function load(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    return user;
  }
  const view = (user) => ({
    userId: user.id,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
  });

  return {
    /** @param {{ userId: string }} input */
    async getUserDocument({ userId }) {
      return view(await load(userId));
    },
    /** @param {{ userId: string, documentType: string|null, documentNumber: string|null }} input */
    async setUserDocument({ userId, documentType, documentNumber }) {
      const user = await load(userId);
      user.setDocument({ documentType, documentNumber });
      return view(await userRepository.update(user));
    },
  };
}
