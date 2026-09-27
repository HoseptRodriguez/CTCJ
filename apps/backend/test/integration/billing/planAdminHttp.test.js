import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetBilling, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';
const NOTICE_KEY = 'billing.priceChangeNoticeDays';
// Date-only keys in the club's calendar (UTC-5, no daylight saving).
const clubDay = (offsetDays = 0) =>
  new Date(Date.now() - 5 * 3600e3 + offsetDays * 864e5).toISOString().slice(0, 10);

async function seedUser(roleCode) {
  const passwordHash = await createArgon2PasswordHasher().hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `${roleCode.toLowerCase()}-${randomUUID()}@example.com`,
      passwordHash,
      firstName: roleCode === ROLE_CODES.ADMINISTRADOR ? 'Marta' : 'Ana',
      lastName: 'Gómez',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  for (const code of [ROLE_CODES.USUARIO, roleCode]) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}

function auditOf(entityId) {
  return prisma.$queryRaw`
    SELECT "action", "actor_user_id"::text AS actor, "before_state" AS before, "after_state" AS after
    FROM "audit_logs" WHERE "entity_id" = ${entityId}::uuid ORDER BY "occurred_at", "id"`;
}

describe('Plans and prices administration (real Postgres)', () => {
  let app;
  let admin;
  let player;
  let as;

  beforeAll(() => {
    app = createApp();
  });
  beforeEach(async () => {
    await resetBilling();
    await resetUsers();
    await prisma.systemSetting.deleteMany({ where: { key: NOTICE_KEY } });
    admin = await seedUser(ROLE_CODES.ADMINISTRADOR);
    player = await seedUser(ROLE_CODES.JUGADOR);
    const tokens = {};
    for (const [name, user] of Object.entries({ admin, player })) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: PASSWORD })
        .expect(200);
      tokens[name] = res.body.accessToken;
    }
    as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });
  });
  afterEach(async () => {
    await resetBilling();
    await resetUsers();
    await prisma.systemSetting.deleteMany({ where: { key: NOTICE_KEY } });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createPlan = (body) =>
    request(app).post('/api/admin/billing/plans').set(as('admin')).send(body);

  it('the code is generated from the name, never edited; the name is required and unique', async () => {
    const created = await createPlan({ name: 'Iniciación Niños', code: 'OTRO' }).expect(201);
    expect(created.body.code).toBe('INICIACION_NINOS');

    await createPlan({ name: '  iniciación niños ' }).expect(409);
    await createPlan({ name: '   ' }).expect(400);

    const edited = await request(app)
      .put(`/api/admin/billing/plans/${created.body.id}`)
      .set(as('admin'))
      .send({ name: 'Iniciación infantil', description: 'Sábados', code: 'X' })
      .expect(200);
    expect(edited.body).toMatchObject({
      code: 'INICIACION_NINOS',
      name: 'Iniciación infantil',
      description: 'Sábados',
    });

    // The database backs the rule up even if the application were bypassed.
    await expect(
      prisma.membershipPlan.create({
        data: { clubId: TEST_CLUB_ID, code: 'DUP', name: 'INICIACIÓN INFANTIL ' },
      }),
    ).rejects.toThrow();

    expect((await auditOf(created.body.id)).map((r) => r.action)).toEqual([
      'PLAN_CREATED',
      'PLAN_UPDATED',
    ]);
  });

  it('a deactivated plan is not offered to new players; current ones keep it', async () => {
    const plan = (await createPlan({ name: 'Avanzado' }).expect(201)).body;
    const enroll = (playerId) =>
      request(app)
        .post('/api/admin/billing/memberships')
        .set(as('admin'))
        .send({ playerId, planId: plan.id, startDate: clubDay(), billingDay: 5 });
    await enroll(player.id).expect(201);

    await request(app)
      .put(`/api/admin/billing/plans/${plan.id}/active`)
      .set(as('admin'))
      .send({ isActive: false })
      .expect(200);

    const other = await seedUser(ROLE_CODES.JUGADOR);
    const refused = await enroll(other.id).expect(409);
    expect(refused.body.code).toBe('plan_not_active');
    const [membership] = await prisma.playerMembership.findMany({ where: { planId: plan.id } });
    expect(membership.status).toBe('ACTIVE');
  });

  it('a price change on a plan with players waits the notice, tells them and is logged', async () => {
    const plan = (await createPlan({ name: 'Iniciación' }).expect(201)).body;
    const priceUrl = `/api/admin/billing/plans/${plan.id}/price`;
    await request(app)
      .put(priceUrl)
      .set(as('admin'))
      .send({ basePriceCop: 180000, validFrom: '2026-01-01' })
      .expect(200);
    await request(app)
      .post('/api/admin/billing/memberships')
      .set(as('admin'))
      .send({ playerId: player.id, planId: plan.id, startDate: clubDay(), billingDay: 5 })
      .expect(201);

    const tooEarly = await request(app)
      .put(priceUrl)
      .set(as('admin'))
      .send({ basePriceCop: 200000, validFrom: clubDay(5) })
      .expect(409);
    expect(tooEarly.body).toMatchObject({
      code: 'price_start_too_early',
      details: { earliestValidFrom: clubDay(30) },
    });

    const changed = await request(app)
      .put(priceUrl)
      .set(as('admin'))
      .send({ basePriceCop: 200000 })
      .expect(200);
    expect(changed.body).toMatchObject({ activePlayers: 1, notifiedPlayers: 1 });
    expect(changed.body.validFrom.slice(0, 10)).toBe(clubDay(30));

    const [notice] = await prisma.notification.findMany({ where: { recipientId: player.id } });
    expect(notice).toMatchObject({
      type: 'PLAN_PRICE_CHANGED',
      title: 'Nuevo precio del plan Iniciación',
    });
    expect(notice.body).toMatch(/180\.000.*200\.000/);

    // The catalog still charges the old price today and shows the waiting one.
    const catalog = await request(app).get('/api/admin/billing/plans').set(as('admin')).expect(200);
    expect(catalog.body.plans[0]).toMatchObject({
      currentPriceCop: 180000,
      scheduledPrice: { basePriceCop: 200000 },
      activePlayers: 1,
      noticeDays: 30,
    });

    // plan_price_history: previous price, new price, who and when.
    const history = await prisma.$queryRaw`
      SELECT "previous_price_cop"::int AS prev, "new_price_cop"::int AS next, "changed_by"::text AS who
      FROM "plan_price_history" WHERE "plan_id" = ${plan.id}::uuid ORDER BY "effective_from"`;
    expect(history).toEqual([
      { prev: null, next: 180000, who: admin.id },
      { prev: 180000, next: 200000, who: admin.id },
    ]);
    const apiHistory = await request(app).get(`${priceUrl}s`).set(as('admin')).expect(200);
    expect(apiHistory.body.prices[0]).toMatchObject({
      basePriceCop: 200000,
      previousPriceCop: 180000,
      changedByName: 'Marta Gómez',
      state: 'SCHEDULED',
    });

    // Cancelling the waiting change restores the price in effect.
    await request(app).delete(`${priceUrl}/scheduled`).set(as('admin')).expect(200);
    const after = await request(app).get('/api/admin/billing/plans').set(as('admin')).expect(200);
    expect(after.body.plans[0]).toMatchObject({ currentPriceCop: 180000, scheduledPrice: null });

    expect((await auditOf(plan.id)).map((r) => r.action)).toEqual([
      'PLAN_CREATED',
      'PLAN_PRICE_SET',
      'PLAN_PRICE_SET',
      'PLAN_PRICE_CANCELLED',
    ]);
  });

  it('the notice period is a setting only the administrator changes', async () => {
    await request(app)
      .get('/api/admin/billing/settings/price-notice')
      .set(as('admin'))
      .expect(200, { days: 30 });
    await request(app)
      .put('/api/admin/billing/settings/price-notice')
      .set(as('player'))
      .send({ days: 10 })
      .expect(403);
    await request(app)
      .put('/api/admin/billing/settings/price-notice')
      .set(as('admin'))
      .send({ days: 200 })
      .expect(400);
    await request(app)
      .put('/api/admin/billing/settings/price-notice')
      .set(as('admin'))
      .send({ days: 15 })
      .expect(200);
    await request(app)
      .get('/api/admin/billing/settings/price-notice')
      .set(as('admin'))
      .expect(200, { days: 15 });
  });

  it.each([
    [{ basePriceCop: 0 }, 'El precio debe ser mayor que 0.'],
    [{ basePriceCop: 1500.5 }, 'El precio va en pesos, sin decimales.'],
  ])('price validation: %j', async (body, message) => {
    const plan = (await createPlan({ name: 'Iniciación' }).expect(201)).body;
    const res = await request(app)
      .put(`/api/admin/billing/plans/${plan.id}/price`)
      .set(as('admin'))
      .send(body)
      .expect(400);
    expect(res.body.title).toBe(message);
  });
});
