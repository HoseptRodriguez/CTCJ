import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES, MEMBERSHIP_STATUS } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  // Lowercase -- User's domain entity always normalizes email on construction
  // (even reconstructing from a DB row), so anything else would round-trip
  // lowercased and fail equality checks against the original.
  const email = `${(roleCode ?? 'usuario').toLowerCase()}-${randomUUID()}@example.com`;
  const passwordHash = await passwordHasher.hash(PASSWORD);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  const usuarioRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.USUARIO } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: usuarioRole.id } });
  if (roleCode && roleCode !== ROLE_CODES.USUARIO) {
    const extraRole = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: extraRole.id } });
  }

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

describe('Membership status admin HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(resetUsers);
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lookup: ADMINISTRADOR and RECEPCION can find a user by email, others cannot', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);
    const playerToken = await login(app, player.email, player.password);

    const adminRes = await request(app)
      .get('/api/admin/users/lookup')
      .query({ email: player.email })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminRes.body).toMatchObject({
      id: player.id,
      email: player.email,
      membershipStatus: null,
    });
    expect(adminRes.body.roleCodes).toEqual(expect.arrayContaining([ROLE_CODES.JUGADOR]));

    await request(app)
      .get('/api/admin/users/lookup')
      .query({ email: player.email })
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    await request(app)
      .get('/api/admin/users/lookup')
      .query({ email: player.email })
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);
  });

  it('lookup: unknown email returns 404', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const adminToken = await login(app, admin.email, admin.password);

    await request(app)
      .get('/api/admin/users/lookup')
      .query({ email: 'nadie@example.com' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('set membership status: ADMINISTRADOR can, RECEPCION cannot (403)', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);

    const res = await request(app)
      .put(`/api/admin/users/${player.id}/membership-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: MEMBERSHIP_STATUS.OVERDUE })
      .expect(200);
    expect(res.body).toEqual({ userId: player.id, membershipStatus: MEMBERSHIP_STATUS.OVERDUE });

    await request(app)
      .put(`/api/admin/users/${player.id}/membership-status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: MEMBERSHIP_STATUS.ACTIVE })
      .expect(403);
  });

  it('set membership status on a non-JUGADOR user rejects with 409', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const plainUser = await seedVerifiedUser(); // only USUARIO
    const adminToken = await login(app, admin.email, admin.password);

    const res = await request(app)
      .put(`/api/admin/users/${plainUser.id}/membership-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: MEMBERSHIP_STATUS.ACTIVE })
      .expect(409);
    expect(res.body.code).toBe('membership_not_applicable');
  });

  it('a player can read their own membership status via /api/identity/me', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const playerToken = await login(app, player.email, player.password);

    let res = await request(app)
      .get('/api/identity/me/membership-status')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(res.body).toEqual({ status: null });

    await request(app)
      .put(`/api/admin/users/${player.id}/membership-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: MEMBERSHIP_STATUS.ACTIVE })
      .expect(200);

    res = await request(app)
      .get('/api/identity/me/membership-status')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(res.body).toEqual({ status: MEMBERSHIP_STATUS.ACTIVE });
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).get('/api/admin/users/lookup').query({ email: 'x@example.com' }).expect(401);
    await request(app).get('/api/identity/me/membership-status').expect(401);
  });
});
