import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedUser(roleCode) {
  const passwordHash = await createArgon2PasswordHasher().hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `${roleCode.toLowerCase()}-${randomUUID()}@example.com`,
      passwordHash,
      firstName: 'Marta',
      lastName: 'Gómez',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  for (const code of new Set([ROLE_CODES.USUARIO, roleCode])) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}

function futureSlot(hoursFromNow = 3) {
  const base = new Date();
  base.setUTCMinutes(0, 0, 0);
  const start = new Date(base.getTime() + hoursFromNow * 3600e3);
  return { start: start.toISOString(), end: new Date(start.getTime() + 3600e3).toISOString() };
}

describe('Court prices (real Postgres)', () => {
  let app;
  let court;
  let originalPrice;
  let as;
  let admin;

  beforeAll(async () => {
    app = createApp();
    court = await prisma.court.findFirstOrThrow({
      where: { clubId: TEST_CLUB_ID, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    originalPrice = court.defaultPriceCop;
  });
  beforeEach(async () => {
    await resetReservations();
    await resetUsers();
    await prisma.courtPriceHistory.deleteMany({ where: { courtId: court.id } });
    await prisma.court.update({ where: { id: court.id }, data: { defaultPriceCop: 50000n } });
    admin = await seedUser(ROLE_CODES.ADMINISTRADOR);
    const player = await seedUser(ROLE_CODES.USUARIO);
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
    await resetReservations();
    await resetUsers();
    await prisma.courtPriceHistory.deleteMany({ where: { courtId: court.id } });
  });
  afterAll(async () => {
    await prisma.court.update({
      where: { id: court.id },
      data: { defaultPriceCop: originalPrice },
    });
    await prisma.$disconnect();
  });

  it('a confirmed reservation keeps its price; the change is recorded and reported', async () => {
    const hold = await request(app)
      .post('/api/booking/hold')
      .set(as('player'))
      .send({ courtId: court.id, ...futureSlot() })
      .expect(201);
    await request(app)
      .post('/api/booking/confirm')
      .set(as('player'))
      .send({ reservationId: hold.body.reservationId })
      .expect(200);

    const changed = await request(app)
      .put(`/api/booking/courts/${court.id}/price`)
      .set(as('admin'))
      .send({ priceCop: 65000 })
      .expect(200);
    expect(changed.body).toMatchObject({
      priceCop: 65000,
      previousPriceCop: 50000,
      upcomingReservations: 1,
    });

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: hold.body.reservationId },
    });
    expect(reservation.priceCop).toBe(50000n);

    const history = await request(app)
      .get(`/api/booking/courts/${court.id}/price-history`)
      .set(as('admin'))
      .expect(200);
    expect(history.body).toMatchObject({ priceCop: 65000, upcomingReservations: 1 });
    expect(history.body.history).toEqual([
      expect.objectContaining({
        previousPriceCop: 50000,
        newPriceCop: 65000,
        changedBy: admin.id,
        changedByName: 'Marta Gómez',
      }),
    ]);

    const [audit] = await prisma.$queryRaw`
      SELECT "action", "before_state" AS before, "after_state" AS after FROM "audit_logs"
      WHERE "entity_id" = ${court.id}::uuid AND "actor_user_id" = ${admin.id}::uuid`;
    expect(audit).toEqual({
      action: 'COURT_PRICE_CHANGED',
      before: { priceCop: '50000' },
      after: { priceCop: '65000' },
    });
  });

  it('price 0 is refused, and only the administrator sees the history', async () => {
    const res = await request(app)
      .put(`/api/booking/courts/${court.id}/price`)
      .set(as('admin'))
      .send({ priceCop: 0 })
      .expect(400);
    expect(res.body.title).toBe('El precio debe ser mayor que 0.');
    await request(app)
      .get(`/api/booking/courts/${court.id}/price-history`)
      .set(as('player'))
      .expect(403);
  });
});
