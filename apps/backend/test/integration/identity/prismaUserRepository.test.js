import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ROLE_CODES } from '@ctcj/shared';

import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

describe('prismaUserRepository (real Postgres)', () => {
  const repo = createPrismaUserRepository(prisma);

  beforeEach(resetUsers);
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('create() persists the user and its initial role grant', async () => {
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'Integracion@Example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });

    const saved = await repo.create(user);
    expect(saved.email).toBe('integracion@example.com');

    const found = await repo.findById(user.id);
    expect(found).not.toBeNull();
    expect(found.listRoleCodes()).toEqual([ROLE_CODES.USUARIO]);
    expect(found.status).toBe('PENDING_VERIFICATION');
  });

  it('findByEmail is case-insensitive (citext)', async () => {
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'jugador@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await repo.create(user);

    const found = await repo.findByEmail(TEST_CLUB_ID, 'JUGADOR@EXAMPLE.COM');
    expect(found).not.toBeNull();
    expect(found.id).toBe(user.id);
  });

  it('existsByEmail reflects current state', async () => {
    expect(await repo.existsByEmail(TEST_CLUB_ID, 'nadie@example.com')).toBe(false);

    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'nadie@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await repo.create(user);

    expect(await repo.existsByEmail(TEST_CLUB_ID, 'nadie@example.com')).toBe(true);
  });

  it('update() persists scalar field changes', async () => {
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'jugador2@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await repo.create(user);

    user.verifyEmail(new Date('2026-08-01T10:00:00Z'));
    user.recordFailedLogin(new Date('2026-08-01T10:05:00Z'));
    await repo.update(user);

    const found = await repo.findById(user.id);
    expect(found.status).toBe('ACTIVE');
    expect(found.failedLoginCount).toBe(1);
  });

  it('addRoleGrant() adds a role visible on the next findById', async () => {
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: 'entrenador@example.com',
      passwordHash: 'hashed:x',
      firstName: 'Carlos',
      lastName: 'Ruiz',
    });
    await repo.create(user);

    await repo.addRoleGrant(user.id, ROLE_CODES.ENTRENADOR, null);

    const found = await repo.findById(user.id);
    expect(found.hasRole(ROLE_CODES.ENTRENADOR)).toBe(true);
    expect(found.hasRole(ROLE_CODES.USUARIO)).toBe(true);
  });
});
