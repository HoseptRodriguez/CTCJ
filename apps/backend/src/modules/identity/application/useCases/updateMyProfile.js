import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * Self-service: edit the caller's own phone/birthDate/bio. Deliberately
 * excludes documentType/documentNumber (identity documents stay staff-only)
 * and avatarUrl (its own dedicated upload flow, uploadMyAvatar.js).
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository }} deps
 */
export function createUpdateMyProfile({ userRepository }) {
  /** @param {{ userId: string, phone?: string, birthDate?: Date, bio?: string }} input */
  return async function updateMyProfile({ userId, phone, birthDate, bio }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    user.updateProfile({ phone, birthDate, bio });
    const saved = await userRepository.update(user);
    return {
      id: saved.id,
      firstName: saved.firstName,
      lastName: saved.lastName,
      email: saved.email,
      phone: saved.phone,
      birthDate: saved.birthDate,
      bio: saved.bio,
      avatarUrl: saved.avatarUrl,
    };
  };
}
