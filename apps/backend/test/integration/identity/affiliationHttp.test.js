import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';

import { prisma, resetUsers, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
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

describe('Affiliation request HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(resetUsers);
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: request -> admin lists PENDING -> approves -> role granted -> /me reflects it', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser();
    const adminToken = await login(app, admin.email, admin.password);
    const playerToken = await login(app, player.email, player.password);

    const requestRes = await request(app)
      .post('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ notes: 'Quiero unirme a la academia' })
      .expect(201);
    expect(requestRes.body.status).toBe('PENDING');

    const listRes = await request(app)
      .get('/api/admin/affiliation-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.requests.some((r) => r.id === requestRes.body.id)).toBe(true);

    const decideRes = await request(app)
      .put(`/api/admin/affiliation-requests/${requestRes.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED' })
      .expect(200);
    expect(decideRes.body.status).toBe('APPROVED');

    const meRes = await request(app)
      .get('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);
    expect(meRes.body.requests[0].status).toBe('APPROVED');

    // Confirm the role was actually granted -- log in again to get a fresh token with updated roles.
    const freshLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: player.email, password: player.password })
      .expect(200);
    expect(freshLoginRes.body.roles).toContain(ROLE_CODES.JUGADOR);
  });

  it('non-admin gets 403 deciding a request', async () => {
    const player = await seedVerifiedUser();
    const other = await seedVerifiedUser();
    const playerToken = await login(app, player.email, player.password);
    const otherToken = await login(app, other.email, other.password);

    const requestRes = await request(app)
      .post('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(201);

    await request(app)
      .put(`/api/admin/affiliation-requests/${requestRes.body.id}/decision`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ decision: 'APPROVED' })
      .expect(403);
  });

  it('duplicate PENDING request gets 409', async () => {
    const player = await seedVerifiedUser();
    const playerToken = await login(app, player.email, player.password);

    await request(app)
      .post('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(201);

    const res = await request(app)
      .post('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(409);
    expect(res.body.code).toBe('affiliation_request_already_pending');
  });

  it('a JUGADOR requesting again gets 409 already_jugador', async () => {
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const playerToken = await login(app, player.email, player.password);

    const res = await request(app)
      .post('/api/identity/me/affiliation-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(409);
    expect(res.body.code).toBe('already_jugador');
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).post('/api/identity/me/affiliation-requests').send({}).expect(401);
    await request(app).get('/api/admin/affiliation-requests').expect(401);
  });
});
