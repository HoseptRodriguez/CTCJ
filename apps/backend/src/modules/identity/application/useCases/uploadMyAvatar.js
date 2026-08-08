import { isAllowedAvatarMimeType } from '../../domain/policies/avatarPolicy.js';
import { UserNotFound } from '../errors/UserNotFound.js';
import { InvalidAvatarFile } from '../errors/InvalidAvatarFile.js';

/**
 * Self-service: replace the caller's own profile picture. File size is
 * enforced by multer's `limits` at the HTTP boundary (infrastructure/http/
 * uploadMiddleware.js); mimetype is checked again here (defense-in-depth --
 * see avatarPolicy.js's docstring).
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository, avatarStorage: import('../ports/AvatarStorage.js').AvatarStorage }} deps
 */
export function createUploadMyAvatar({ userRepository, avatarStorage }) {
  /** @param {{ userId: string, buffer: Buffer, mimeType: string }} input */
  return async function uploadMyAvatar({ userId, buffer, mimeType }) {
    if (!isAllowedAvatarMimeType(mimeType)) {
      throw new InvalidAvatarFile();
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    const url = await avatarStorage.save(buffer, mimeType);
    user.setAvatarUrl(url);
    const saved = await userRepository.update(user);
    return { avatarUrl: saved.avatarUrl };
  };
}
