import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';
const SETTING_KEY = 'booking.secondHourEnabled';

async function seedUser(roleCode = ROLE_CODES.USUARIO) {
  const passwordHash = await createArgon2PasswordHasher().hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `${roleCode.toLowerCase()}-${randomUUID()}@example.com`,
      passwordHash,
      firstName: 'Ana',
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

// One-hour slot starting `hoursFromNow` hours from now, on the hour.
function slot(hoursFromNow) {
  const base = new Date();
  base.setUTCMinutes(0, 0, 0);
  const start = new Date(base.getTime() + hoursFromNow * 3600e3);
  return { start: start.toISOString(), end: new Date(start.getTime() + 3600e3).toISOString() };
}

describe('Two consecutive hours in one reservation (real Postgres)', () => {
  let app;
  let court;
  let originalPrice;
  let as;

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
    await prisma.systemSetting.deleteMany({ where: { key: SETTING_KEY } });
    await prisma.court.update({ where: { id: court.id }, data: { defaultPriceCop: 20000n } });
    const users = {
      ana: await seedUser(),
      luis: await seedUser(),
      admin: await seedUser(ROLE_CODES.ADMINISTRADOR),
    };
    const tokens = {};
    for (const [name, user] of Object.entries(users)) {
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
    await prisma.systemSetting.deleteMany({ where: { key: SETTING_KEY } });
  });
  afterAll(async () => {
    await prisma.court.update({
      where: { id: court.id },
      data: { defaultPriceCop: originalPrice },
    });
    await prisma.$disconnect();
  });

  const hold = (who, hoursFromNow) =>
    request(app)
      .post('/api/booking/hold')
      .set(as(who))
      .send({ courtId: court.id, ...slot(hoursFromNow) });

  it('add and remove the second hour; confirm freezes the price of both; one cancellation frees both', async () => {
    const held = (await hold('ana', 26).expect(201)).body;

    const added = await request(app)
      .post(`/api/booking/${held.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(200);
    expect(added.body).toMatchObject({ hours: 2, priceCop: 40000, periodEnd: slot(27).end });
    expect(added.body.holdExpiresAt).toBe(held.holdExpiresAt);

    const removed = await request(app)
      .delete(`/api/booking/${held.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(200);
    expect(removed.body).toMatchObject({ hours: 1, priceCop: 20000, periodEnd: slot(26).end });

    await request(app)
      .post(`/api/booking/${held.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(200);
    const confirmed = await request(app)
      .post('/api/booking/confirm')
      .set(as('ana'))
      .send({ reservationId: held.reservationId })
      .expect(200);
    expect(confirmed.body).toMatchObject({ status: 'CONFIRMED', priceCop: 40000, hours: 2 });

    // One row, one block of two hours, for everyone.
    const rows = await prisma.reservation.findMany({ where: { courtId: court.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].periodEnd.toISOString()).toBe(slot(27).end);

    // Luis can't take the second hour of a confirmed 2-hour reservation...
    const refused = await hold('luis', 27).expect(409);
    expect(refused.body.code).toBe('slot_not_available');
    // ...until Ana cancels, which frees both hours.
    await request(app).post(`/api/booking/${held.reservationId}/cancel`).set(as('ana')).expect(200);
    await hold('luis', 27).expect(201);
  });

  it('if the next hour is taken, the database refuses it and the first hour stays held', async () => {
    const mine = (await hold('ana', 26).expect(201)).body;
    await hold('luis', 27).expect(201);

    const res = await request(app)
      .post(`/api/booking/${mine.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(409);
    expect(res.body).toMatchObject({
      code: 'second_hour_unavailable',
      details: { secondHourStart: slot(27).start },
    });
    const stored = await prisma.reservation.findUniqueOrThrow({
      where: { id: mine.reservationId },
    });
    expect(stored.status).toBe('HOLD');
    expect(stored.periodEnd.toISOString()).toBe(slot(26).end);
  });

  it('a 2-hour reservation counts as one in the limit of 2 active reservations', async () => {
    const first = (await hold('ana', 26).expect(201)).body;
    await request(app)
      .post(`/api/booking/${first.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(200);
    await hold('ana', 30).expect(201);
    const third = await hold('ana', 34).expect(409);
    expect(third.body.code).toBe('max_concurrent_reservations_exceeded');
  });

  it('the administrator turns the option off and on; it is on by default and public to read', async () => {
    await request(app).get('/api/booking/settings/second-hour').expect(200, { enabled: true });
    await request(app)
      .put('/api/booking/settings/second-hour')
      .set(as('ana'))
      .send({ enabled: false })
      .expect(403);
    await request(app)
      .put('/api/booking/settings/second-hour')
      .set(as('admin'))
      .send({ enabled: false })
      .expect(200);

    const held = (await hold('ana', 26).expect(201)).body;
    const res = await request(app)
      .post(`/api/booking/${held.reservationId}/second-hour`)
      .set(as('ana'))
      .expect(409);
    expect(res.body.code).toBe('second_hour_disabled');
  });
});
