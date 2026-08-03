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

describe('Guardianship HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(resetUsers);
  afterEach(resetUsers);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: request -> admin lists -> approves -> role granted -> visible via /me', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const guardian = await seedVerifiedUser();
    const minor = await seedVerifiedUser();
    const adminToken = await login(app, admin.email, admin.password);
    const guardianToken = await login(app, guardian.email, guardian.password);

    const requestRes = await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: minor.email, canPay: true, canBook: true })
      .expect(201);
    expect(requestRes.body.status).toBe('PENDING');

    const listRes = await request(app)
      .get('/api/admin/guardianships')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.guardianships.some((g) => g.id === requestRes.body.id)).toBe(true);

    const decideRes = await request(app)
      .put(`/api/admin/guardianships/${requestRes.body.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED' })
      .expect(200);
    expect(decideRes.body.status).toBe('APPROVED');

    const meRes = await request(app)
      .get('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .expect(200);
    expect(meRes.body.guardianships[0]).toMatchObject({ status: 'APPROVED', canBook: true });

    const freshLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: guardian.email, password: guardian.password })
      .expect(200);
    expect(freshLoginRes.body.roles).toContain(ROLE_CODES.PADRE_TUTOR);
  });

  it('non-admin gets 403 deciding a guardianship', async () => {
    const guardian = await seedVerifiedUser();
    const minor = await seedVerifiedUser();
    const other = await seedVerifiedUser();
    const guardianToken = await login(app, guardian.email, guardian.password);
    const otherToken = await login(app, other.email, other.password);

    const requestRes = await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: minor.email, canPay: false, canBook: true })
      .expect(201);

    await request(app)
      .put(`/api/admin/guardianships/${requestRes.body.id}/decision`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ decision: 'APPROVED' })
      .expect(403);
  });

  it('rejects a self-link with 403', async () => {
    const guardian = await seedVerifiedUser();
    const guardianToken = await login(app, guardian.email, guardian.password);

    const res = await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: guardian.email, canPay: false, canBook: true })
      .expect(403);
    expect(res.body.code).toBe('guardianship_self_link_forbidden');
  });

  it('rejects a duplicate pending/approved pair with 409', async () => {
    const guardian = await seedVerifiedUser();
    const minor = await seedVerifiedUser();
    const guardianToken = await login(app, guardian.email, guardian.password);

    await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: minor.email, canPay: false, canBook: true })
      .expect(201);

    const res = await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: minor.email, canPay: false, canBook: true })
      .expect(409);
    expect(res.body.code).toBe('guardianship_already_exists');
  });

  it('unknown minor email gets 404', async () => {
    const guardian = await seedVerifiedUser();
    const guardianToken = await login(app, guardian.email, guardian.password);

    await request(app)
      .post('/api/identity/me/guardianships')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ minorEmail: 'nadie@example.com', canPay: false, canBook: true })
      .expect(404);
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).post('/api/identity/me/guardianships').send({}).expect(401);
    await request(app).get('/api/admin/guardianships').expect(401);
  });
});
