import { describe, expect, it } from 'vitest';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';

function buildUser() {
  return User.registerPublic({
    id: 'user-1',
    clubId: 'club-1',
    email: 'ana@example.com',
    passwordHash: 'hashed:x',
    firstName: 'Ana',
    lastName: 'Gomez',
  });
}

describe('User.updateProfile', () => {
  it('sets phone, birthDate, and bio when provided', () => {
    const user = buildUser();
    const birthDate = new Date('2000-01-15');

    user.updateProfile({ phone: '3001234567', birthDate, bio: 'Hola.' });

    expect(user.phone).toBe('3001234567');
    expect(user.birthDate).toBe(birthDate);
    expect(user.bio).toBe('Hola.');
  });

  it('leaves a field unchanged when omitted (undefined)', () => {
    const user = buildUser();
    user.updateProfile({ phone: '3001234567' });

    user.updateProfile({ bio: 'Nueva bio.' });

    expect(user.phone).toBe('3001234567');
  });

  it('clears a field when explicitly passed null', () => {
    const user = buildUser();
    user.updateProfile({ phone: '3001234567' });

    user.updateProfile({ phone: null });

    expect(user.phone).toBeNull();
  });
});

describe('User.setAvatarUrl', () => {
  it('replaces the avatar URL', () => {
    const user = buildUser();

    user.setAvatarUrl('/uploads/avatars/x.jpg');

    expect(user.avatarUrl).toBe('/uploads/avatars/x.jpg');
  });
});
