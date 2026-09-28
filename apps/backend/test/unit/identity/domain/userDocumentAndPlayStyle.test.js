import { describe, expect, it } from 'vitest';
import { setUserDocumentSchema, updateMyProfileSchema } from '@ctcj/shared';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { createGetPlayerPlayStyle } from '../../../../src/modules/identity/application/useCases/getPlayerPlayStyle.js';
import { createUserDocumentUseCases } from '../../../../src/modules/identity/application/useCases/userDocument.js';

function player() {
  return User.registerPublic({
    id: 'u1',
    clubId: 'club-1',
    email: 'ana@correo.com',
    passwordHash: 'h',
    firstName: 'Ana',
    lastName: 'Gómez',
  });
}

describe('play style (optional, the player edits it)', () => {
  it('dominant hand and backhand are stored and can be cleared', () => {
    const user = player();
    user.updateProfile({ dominantHand: 'LEFT', backhand: 'TWO_HANDED' });
    expect([user.dominantHand, user.backhand]).toEqual(['LEFT', 'TWO_HANDED']);
    user.updateProfile({ dominantHand: null });
    expect([user.dominantHand, user.backhand]).toEqual([null, 'TWO_HANDED']);
  });

  it('only the listed values are accepted', () => {
    expect(updateMyProfileSchema.safeParse({ dominantHand: 'AMBIDEXTROUS' }).success).toBe(true);
    expect(updateMyProfileSchema.safeParse({ dominantHand: 'IZQUIERDA' }).success).toBe(false);
    expect(updateMyProfileSchema.safeParse({ backhand: 'ONE_HANDED' }).success).toBe(true);
  });

  it("the coaches' card gets only the play style, nothing else of the profile", async () => {
    const user = player();
    user.updateProfile({ dominantHand: 'RIGHT', backhand: 'ONE_HANDED', phone: '3000000000' });
    const get = createGetPlayerPlayStyle({ userRepository: { findById: async () => user } });
    expect(await get({ playerId: 'u1' })).toEqual({
      id: 'u1',
      dominantHand: 'RIGHT',
      backhand: 'ONE_HANDED',
    });
  });
});

describe('identity document (optional, reception only)', () => {
  it('is set and cleared by staff; type and number go together', async () => {
    const user = player();
    const repo = { findById: async () => user, update: async (u) => u };
    const uc = createUserDocumentUseCases({ userRepository: repo });
    expect(await uc.getUserDocument({ userId: 'u1' })).toEqual({
      userId: 'u1',
      documentType: null,
      documentNumber: null,
    });
    await uc.setUserDocument({ userId: 'u1', documentType: 'CC', documentNumber: '1069123456' });
    expect(user.documentNumber).toBe('1069123456');

    expect(
      setUserDocumentSchema.safeParse({ documentType: 'CC', documentNumber: null }).success,
    ).toBe(false);
    expect(
      setUserDocumentSchema.safeParse({ documentType: 'CC', documentNumber: '1.069.123' }).success,
    ).toBe(false);
    expect(
      setUserDocumentSchema.safeParse({ documentType: null, documentNumber: null }).success,
    ).toBe(true);
  });
});
