import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

import { prisma, resetUsers } from './testDb.js';

const PASSWORD = 'ClaveSegura123';
const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

describe('A deactivated account cannot sign in or keep its session (real Postgres)', () => {
  let app;
  let user;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetUsers();
    user = await prisma.user.create({
      data: {
        id: randomUUID(),
        clubId: TEST_CLUB_ID,
        email: `duplicada-${randomUUID()}@example.com`,
        passwordHash: await createArgon2PasswordHasher().hash(PASSWORD),
        firstName: 'Orlando',
        lastName: 'Rodriguez',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.USUARIO } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  });
  afterEach(async () => {
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const login = () =>
    request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });

  it('login answers 403 account_not_active; an open session stops refreshing', async () => {
    const signedIn = await login().expect(200);
    const cookie = signedIn.headers['set-cookie'];

    await prisma.user.update({ where: { id: user.id }, data: { status: 'DEACTIVATED' } });

    const refused = await login().expect(403);
    expect(refused.body.code).toBe('account_not_active');
    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
