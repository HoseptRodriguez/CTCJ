import { isAllowedAvatarMimeType } from '../../domain/policies/avatarPolicy.js';
import { UserNotFound } from '../errors/UserNotFound.js';
import { InvalidAvatarFile } from '../errors/InvalidAvatarFile.js';

/**
 * Self-service: replace the caller's own profile picture. File size is
 * enforced by multer's `limits` at the HTTP boundary (infrastructure/http/
 * uploadMiddleware.js); mimetype is checked again here (defense-in-depth --
 * see avatarPolicy.js's docstring).
 *
 * The image is then decoded and normalized by avatarImageProcessor: a file
 * that only looks like an image (right type, broken content) is rejected
 * instead of being stored and shown as a broken picture.
 *
 * @param {{ userRepository: import('../ports/UserRepository.js').UserRepository, avatarStorage: import('../ports/AvatarStorage.js').AvatarStorage, avatarImageProcessor: import('../ports/AvatarImageProcessor.js').AvatarImageProcessor }} deps
 */
export function createUploadMyAvatar({ userRepository, avatarStorage, avatarImageProcessor }) {
  /** @param {{ userId: string, buffer: Buffer, mimeType: string }} input */
  return async function uploadMyAvatar({ userId, buffer, mimeType }) {
    if (!isAllowedAvatarMimeType(mimeType)) {
      throw new InvalidAvatarFile();
    }
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFound();
    }
    const image = await avatarImageProcessor.process(buffer); // throws InvalidAvatarFile
    const url = await avatarStorage.save(image.buffer, image.mimeType);
    user.setAvatarUrl(url);
    const saved = await userRepository.update(user);
    return { avatarUrl: saved.avatarUrl };
  };
}
