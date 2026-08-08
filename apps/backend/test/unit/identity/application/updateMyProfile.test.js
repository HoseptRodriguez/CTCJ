import { beforeEach, describe, expect, it } from 'vitest';

import { createUpdateMyProfile } from '../../../../src/modules/identity/application/useCases/updateMyProfile.js';
import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { UserNotFound } from '../../../../src/modules/identity/application/errors/UserNotFound.js';

import { createFakeUserRepository } from './fakes.js';

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

describe('updateMyProfile', () => {
  let userRepository;
  let updateMyProfile;

  beforeEach(() => {
    userRepository = createFakeUserRepository();
    updateMyProfile = createUpdateMyProfile({ userRepository });
  });

  it('updates phone, birthDate, and bio', async () => {
    await seedUser(userRepository);
    const birthDate = new Date('2000-01-15');

    const result = await updateMyProfile({
      userId: 'user-1',
      phone: '3001234567',
      birthDate,
      bio: 'Me encanta el tenis.',
    });

    expect(result).toMatchObject({
      phone: '3001234567',
      birthDate,
      bio: 'Me encanta el tenis.',
    });
    const stored = await userRepository.findById('user-1');
    expect(stored.phone).toBe('3001234567');
    expect(stored.bio).toBe('Me encanta el tenis.');
  });

  it('leaves fields untouched when not provided', async () => {
    await seedUser(userRepository);
    await updateMyProfile({ userId: 'user-1', phone: '3001234567' });

    const result = await updateMyProfile({ userId: 'user-1', bio: 'Nueva bio.' });

    expect(result.phone).toBe('3001234567');
    expect(result.bio).toBe('Nueva bio.');
  });

  it('clears a field when explicitly set to null', async () => {
    await seedUser(userRepository);
    await updateMyProfile({ userId: 'user-1', phone: '3001234567' });

    const result = await updateMyProfile({ userId: 'user-1', phone: null });

    expect(result.phone).toBeNull();
  });

  it('throws UserNotFound for a nonexistent user', async () => {
    await expect(updateMyProfile({ userId: 'does-not-exist', bio: 'x' })).rejects.toThrow(
      UserNotFound,
    );
  });
});
