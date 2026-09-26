import { beforeEach, describe, expect, it } from 'vitest';

import { createUploadMyAvatar } from '../../../../src/modules/identity/application/useCases/uploadMyAvatar.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';
import { InvalidAvatarFile } from '../../../../src/modules/identity/application/errors/InvalidAvatarFile.js';

import { createFakeUserRepository } from './fakes.js';

function createFakeAvatarStorage() {
  const saved = [];
  return {
    saved,
    async save(buffer, mimeType) {
      saved.push({ buffer, mimeType });
      return `/uploads/avatars/fake-${saved.length}.jpg`;
    },
  };
}

async function seedUser(userRepository) {
  const user = User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'ana@example.com',
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
  await userRepository.create(user);
  return user;
}

/** Accepts anything starting with "img", like a decoder would accept a real image. */
function createFakeAvatarImageProcessor() {
  return {
    async process(buffer) {
      if (!buffer.toString().startsWith('img')) throw new InvalidAvatarFile();
      return { buffer: Buffer.from('webp-bytes'), mimeType: 'image/webp' };
    },
  };
}

describe('uploadMyAvatar', () => {
  let userRepository;
  let avatarStorage;
  let uploadMyAvatar;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    avatarStorage = createFakeAvatarStorage();
    uploadMyAvatar = createUploadMyAvatar({
      userRepository,
      avatarStorage,
      avatarImageProcessor: createFakeAvatarImageProcessor(),
    });
  });

  it('stores the image and updates avatarUrl', async () => {
    await seedUser(userRepository);
    const buffer = Buffer.from('img-bytes');

    const result = await uploadMyAvatar({ userId: 'user-1', buffer, mimeType: 'image/png' });

    expect(result.avatarUrl).toBe('/uploads/avatars/fake-1.jpg');
    expect(avatarStorage.saved).toHaveLength(1);
    // Stores the processed image, not the raw upload.
    expect(avatarStorage.saved[0]).toEqual({
      buffer: Buffer.from('webp-bytes'),
      mimeType: 'image/webp',
    });
    const stored = await userRepository.findById('user-1');
    expect(stored.avatarUrl).toBe('/uploads/avatars/fake-1.jpg');
  });

  it.each(['image/gif', 'application/pdf', undefined])(
    'rejects a disallowed mimetype (%s) without calling storage',
    async (mimeType) => {
      await seedUser(userRepository);

      await expect(
        uploadMyAvatar({ userId: 'user-1', buffer: Buffer.from('x'), mimeType }),
      ).rejects.toThrow(InvalidAvatarFile);
      expect(avatarStorage.saved).toHaveLength(0);
    },
  );

  it('throws UserNotFound for a nonexistent user', async () => {
    await expect(
      uploadMyAvatar({ userId: 'does-not-exist', buffer: Buffer.from('x'), mimeType: 'image/png' }),
    ).rejects.toThrow(UserNotFound);
  });

  it('a file with an image type but broken content is rejected and never stored', async () => {
    await seedUser(userRepository);
    await expect(
      uploadMyAvatar({ userId: 'user-1', buffer: Buffer.from('broken'), mimeType: 'image/jpeg' }),
    ).rejects.toBeInstanceOf(InvalidAvatarFile);
    expect(avatarStorage.saved).toHaveLength(0);
    expect((await userRepository.findById('user-1')).avatarUrl).toBeNull();
  });
});
