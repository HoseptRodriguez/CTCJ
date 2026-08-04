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

async function seedPricedPlan(app, adminToken, { code = `PLAN-${randomUUID().slice(0, 8)}` } = {}) {
  const planRes = await request(app)
    .post('/api/admin/billing/plans')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ code, name: 'Iniciación' })
    .expect(201);
  await request(app)
    .put(`/api/admin/billing/plans/${planRes.body.id}/price`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ basePriceCop: 100000, validFrom: '2026-01-01' })
    .expect(200);
  return planRes.body.id;
}

async function enrollPlayer(app, adminToken, { playerId, planId, billingDay = 5 }) {
  const res = await request(app)
    .post('/api/admin/billing/memberships')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ playerId, planId, startDate: '2026-01-01', billingDay })
    .expect(201);
  return res.body.id;
}

describe('Invoice HTTP API (real Postgres)', () => {
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

  it('full flow: enroll -> adjustment -> generate -> frozen lines -> pay -> GET shows PAID', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipId = await enrollPlayer(app, adminToken, { playerId: player.id, planId });

    await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        adjustmentType: 'SCHOLARSHIP',
        value: 20000,
        reason: 'Beca deportiva',
        validFrom: '2026-01-01',
      })
      .expect(201);

    const invoiceRes = await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' })
      .expect(201);

    expect(invoiceRes.body.status).toBe('PENDING');
    expect(invoiceRes.body.amountCop).toBe(80000);
    expect(invoiceRes.body.lines).toHaveLength(2);
    const invoiceId = invoiceRes.body.id;

    const payRes = await request(app)
      .post(`/api/admin/billing/invoices/${invoiceId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'CASH', notes: 'pago en recepción' })
      .expect(200);
    expect(payRes.body.status).toBe('PAID');
    expect(payRes.body.paidAmountCop).toBe(80000);

    const getRes = await request(app)
      .get(`/api/admin/billing/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(getRes.body.status).toBe('PAID');
    expect(getRes.body.lines).toHaveLength(2);
  });

  it('changing the plan price after generation never alters the issued invoice', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipId = await enrollPlayer(app, adminToken, { playerId: player.id, planId });

    const invoiceRes = await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' })
      .expect(201);
    expect(invoiceRes.body.amountCop).toBe(100000);

    await request(app)
      .put(`/api/admin/billing/plans/${planId}/price`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basePriceCop: 999999, validFrom: '2026-03-15' })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/admin/billing/invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(getRes.body.amountCop).toBe(100000);
    expect(getRes.body.lines[0].amountCop).toBe(100000);
  });

  it('cancel: legal from PENDING, rejected (409) once PAID', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipId = await enrollPlayer(app, adminToken, { playerId: player.id, planId });

    const pendingInvoiceId = (
      await request(app)
        .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' })
        .expect(201)
    ).body.id;

    await request(app)
      .post(`/api/admin/billing/invoices/${pendingInvoiceId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'generada por error' })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/admin/billing/invoices/${pendingInvoiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(getRes.body.status).toBe('CANCELLED');

    const paidInvoiceId = (
      await request(app)
        .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ periodStart: '2026-04-01', periodEnd: '2026-05-01', dueDate: '2026-04-05' })
        .expect(201)
    ).body.id;
    await request(app)
      .post(`/api/admin/billing/invoices/${paidInvoiceId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'CASH' })
      .expect(200);

    const cancelPaidRes = await request(app)
      .post(`/api/admin/billing/invoices/${paidInvoiceId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'x' })
      .expect(409);
    expect(cancelPaidRes.body.code).toBe('invalid_invoice_state');
  });

  it('duplicate-period generation is rejected with a clean 409, not a raw constraint error', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipId = await enrollPlayer(app, adminToken, { playerId: player.id, planId });
    const body = { periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' };

    await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    const dupRes = await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(409);
    expect(dupRes.body.code).toBe('invoice_already_exists');
  });

  it('role gates: 403 non-staff on generate/cancel, RECEPCION can record payment but not generate/cancel', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
    const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const staffToken = await login(app, staff.email, staff.password);
    const playerToken = await login(app, player.email, player.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipId = await enrollPlayer(app, adminToken, { playerId: player.id, planId });
    const body = { periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' };

    await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send(body)
      .expect(403);
    await request(app)
      .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send(body)
      .expect(403);

    const invoiceId = (
      await request(app)
        .post(`/api/admin/billing/memberships/${membershipId}/invoices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201)
    ).body.id;

    await request(app)
      .post(`/api/admin/billing/invoices/${invoiceId}/cancel`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'x' })
      .expect(403);

    await request(app)
      .post(`/api/admin/billing/invoices/${invoiceId}/payment`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ method: 'CASH' })
      .expect(200);
  });

  it('GET /api/billing/me/invoices scopes strictly to the caller', async () => {
    const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const playerA = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const playerB = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
    const adminToken = await login(app, admin.email, admin.password);
    const playerAToken = await login(app, playerA.email, playerA.password);

    const planId = await seedPricedPlan(app, adminToken);
    const membershipA = await enrollPlayer(app, adminToken, { playerId: playerA.id, planId });
    const membershipB = await enrollPlayer(app, adminToken, { playerId: playerB.id, planId });
    const body = { periodStart: '2026-03-01', periodEnd: '2026-04-01', dueDate: '2026-03-05' };

    await request(app)
      .post(`/api/admin/billing/memberships/${membershipA}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
    await request(app)
      .post(`/api/admin/billing/memberships/${membershipB}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    const meRes = await request(app)
      .get('/api/billing/me/invoices')
      .set('Authorization', `Bearer ${playerAToken}`)
      .expect(200);
    expect(meRes.body.invoices).toHaveLength(1);
    expect(meRes.body.invoices[0].membershipId).toBe(membershipA);
  });

  it('unauthenticated requests get 401', async () => {
    await request(app).get('/api/billing/me/invoices').expect(401);
  });
});
