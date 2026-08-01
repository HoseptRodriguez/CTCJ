import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPrismaRefreshTokenRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaRefreshTokenRepository.js';
import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

describe('prismaRefreshTokenRepository (real Postgres)', () => {
  const repo = createPrismaRefreshTokenRepository(prisma);
  const userRepo = createPrismaUserRepository(prisma);
  let userId;

  beforeEach(async () => {
    await resetUsers();
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'refresh-test@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await userRepo.create(user);
    userId = user.id;
  });
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('create() + findByHash() round-trip', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = randomUUID();
    await repo.create(userId, 'hash-abc', familyId, expiresAt, '127.0.0.1', 'vitest');

    const found = await repo.findByHash('hash-abc');
    expect(found.userId).toBe(userId);
    expect(found.familyId).toBe(familyId);
    expect(found.revokedAt).toBeNull();
    expect(found.replacedBy).toBeNull();
  });

  it('rotate() marks the old token replaced and creates a new one in the same family', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = randomUUID();
    const created = await repo.create(userId, 'hash-old', familyId, expiresAt, null, null);

    await repo.rotate(created.id, 'hash-new', expiresAt, null, null);

    const old = await repo.findByHash('hash-old');
    expect(old.replacedBy).not.toBeNull();

    const fresh = await repo.findByHash('hash-new');
    expect(fresh.familyId).toBe(familyId);
    expect(fresh.revokedAt).toBeNull();
  });

  it('revokeFamily() revokes every token sharing the family id', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const familyId = randomUUID();
    await repo.create(userId, 'hash-fam-1', familyId, expiresAt, null, null);
    await repo.create(userId, 'hash-fam-2', familyId, expiresAt, null, null);

    await repo.revokeFamily(familyId);

    const first = await repo.findByHash('hash-fam-1');
    const second = await repo.findByHash('hash-fam-2');
    expect(first.revokedAt).not.toBeNull();
    expect(second.revokedAt).not.toBeNull();
  });

  it('revokeById() revokes only the targeted token', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const created = await repo.create(userId, 'hash-single', randomUUID(), expiresAt, null, null);

    await repo.revokeById(created.id);

    const found = await repo.findByHash('hash-single');
    expect(found.revokedAt).not.toBeNull();
  });

  it('revokeAllForUser() revokes every active token for that user', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await repo.create(userId, 'hash-user-1', randomUUID(), expiresAt, null, null);
    await repo.create(userId, 'hash-user-2', randomUUID(), expiresAt, null, null);

    await repo.revokeAllForUser(userId);

    expect((await repo.findByHash('hash-user-1')).revokedAt).not.toBeNull();
    expect((await repo.findByHash('hash-user-2')).revokedAt).not.toBeNull();
  });
});
