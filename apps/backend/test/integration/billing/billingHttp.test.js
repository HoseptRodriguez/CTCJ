import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetBilling, TEST_CLUB_ID } from './testDb.js';

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

describe('Billing HTTP API (real Postgres)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetBilling();
    await resetUsers();
  });
  afterEach(async () => {
    await resetBilling();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('full flow: create plan -> set price -> history -> enroll -> status -> adjustment', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    const planRes = await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(201);
    const planId = planRes.body.id;

    await request(app)
      .put(`/api/admin/billing/plans/${planId}/price`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basePriceCop: 50000, validFrom: '2026-01-01' })
      .expect(200);

    await request(app)
      .put(`/api/admin/billing/plans/${planId}/price`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basePriceCop: 60000, validFrom: '2026-03-01' })
      .expect(200);

    const pricesRes = await request(app)
      .get(`/api/admin/billing/plans/${planId}/prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(pricesRes.body.prices).toHaveLength(2);
    const oldPrice = pricesRes.body.prices.find((p) => p.basePriceCop === 50000);
    expect(oldPrice.validTo).not.toBeNull();
    const newPrice = pricesRes.body.prices.find((p) => p.basePriceCop === 60000);
    expect(newPrice.validTo).toBeNull();

    const plansRes = await request(app)
      .get('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(plansRes.body.plans.find((p) => p.id === planId).currentPriceCop).toBe(60000);

    const enrollRes = await request(app)
      .post('/api/admin/billing/memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ playerId: player.id, planId, startDate: '2026-01-01', billingDay: 5 })
      .expect(201);
    const membershipId = enrollRes.body.id;
    expect(enrollRes.body.status).toBe('ACTIVE');

    await request(app)
      .put(`/api/admin/billing/memberships/${membershipId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    const adjRes = await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        adjustmentType: 'SCHOLARSHIP',
        value: 100,
        reason: 'Beca deportiva',
        validFrom: '2026-01-01',
      })
      .expect(201);
    expect(adjRes.body.reason).toBe('Beca deportiva');

    const adjListRes = await request(app)
      .get(`/api/admin/billing/memberships/${membershipId}/adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adjListRes.body.adjustments).toHaveLength(1);
  });

  it('enrolling a non-JUGADOR user is rejected, proving the cross-module wiring works', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const plainUser = await seedVerifiedUser();
    const adminToken = await login(app, admin.email, admin.password);

    const planRes = await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(201);

    const res = await request(app)
      .post('/api/admin/billing/memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: plainUser.id,
        planId: planRes.body.id,
        startDate: '2026-01-01',
        billingDay: 5,
      })
      .expect(409);
    expect(res.body.code).toBe('player_not_eligible');
  });

  it('role gates: non-admin gets 403 on writes, RECEPCION can read', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);
    const playerToken = await login(app, player.email, player.password);

    await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(403);
    await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(403);

    const planRes = await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(201);

    await request(app)
      .get('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    await request(app)
      .get(`/api/admin/billing/memberships?playerId=${player.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    await request(app)
      .get(`/api/admin/billing/memberships?playerId=${player.id}`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);

    await request(app)
      .put(`/api/admin/billing/plans/${planRes.body.id}/price`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ basePriceCop: 50000, validFrom: '2026-01-01' })
      .expect(403);
  });

  it('GET /api/billing/me/memberships scopes strictly to the caller', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const playerA = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const playerB = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const playerAToken = await login(app, playerA.email, playerA.password);

    const planRes = await request(app)
      .post('/api/admin/billing/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INICIACION', name: 'Iniciación' })
      .expect(201);

    await request(app)
      .post('/api/admin/billing/memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: playerA.id,
        planId: planRes.body.id,
        startDate: '2026-01-01',
        billingDay: 5,
      })
      .expect(201);
    await request(app)
      .post('/api/admin/billing/memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        playerId: playerB.id,
        planId: planRes.body.id,
        startDate: '2026-01-01',
        billingDay: 5,
      })
      .expect(201);

    const meRes = await request(app)
      .get('/api/billing/me/memberships')
      .set('Authorization', `Bearer ${playerAToken}`)
      .expect(200);
    expect(meRes.body.memberships).toHaveLength(1);
    expect(meRes.body.memberships[0].playerId).toBe(playerA.id);
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).get('/api/admin/billing/plans').expect(401);
    await request(app).get('/api/billing/me/memberships').expect(401);
  });
});
