import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPrismaEmailVerificationRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaEmailVerificationRepository.js';
import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

describe('prismaEmailVerificationRepository (real Postgres)', () => {
  const repo = createPrismaEmailVerificationRepository(prisma);
  const userRepo = createPrismaUserRepository(prisma);
  let userId;

  beforeEach(async () => {
    await resetUsers();
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'verify-test@example.com',
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
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await repo.create(userId, 'verif-hash-1', expiresAt);

    const found = await repo.findByHash('verif-hash-1');
    expect(found.userId).toBe(userId);
    expect(found.consumedAt).toBeNull();
  });

  it('markConsumed() sets consumedAt', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const created = await repo.create(userId, 'verif-hash-2', expiresAt);

    await repo.markConsumed(created.id);

    const found = await repo.findByHash('verif-hash-2');
    expect(found.consumedAt).not.toBeNull();
  });

  it('returns null for an unknown hash', async () => {
    expect(await repo.findByHash('does-not-exist')).toBeNull();
  });
});
