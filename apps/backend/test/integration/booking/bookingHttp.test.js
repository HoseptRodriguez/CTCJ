import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES } from '@ctcj/shared';

import { createApp } from '../../../src/app.js';
import { createArgon2PasswordHasher } from '../../../src/modules/identity/infrastructure/security/argon2PasswordHasher.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

const PASSWORD = 'ClaveSegura123';

async function seedVerifiedUser({ roleCode = ROLE_CODES.JUGADOR } = {}) {
  const passwordHasher = createArgon2PasswordHasher();
  const email = `${roleCode.toLowerCase()}-${randomUUID()}@example.com`;
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
  if (roleCode !== ROLE_CODES.USUARIO) {
    const extraRole = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: extraRole.id } });
  }

  return { id: user.id, email, password: PASSWORD };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken;
}

function futureSlot(hoursFromNow = 3) {
  const base = new Date();
  base.setUTCMinutes(0, 0, 0);
  const start = new Date(base.getTime() + hoursFromNow * 60 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

describe('Booking HTTP API (real Postgres)', () => {
  let app;
  let courtId;

  beforeAll(async () => {
    app = createApp();
    const court = await prisma.court.findFirstOrThrow({ where: { clubId: TEST_CLUB_ID } });
    courtId = court.id;
  });
  beforeEach(async () => {
    await resetReservations();
    await resetUsers();
  });
  afterEach(async () => {
    await resetReservations();
    await resetUsers();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/booking/courts is public and lists the seeded courts', async () => {
    const res = await request(app).get('/api/booking/courts').expect(200);
    expect(res.body.courts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.courts[0]).toHaveProperty('name');
  });

  it('full flow: hold -> confirm -> cancel', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const { start, end } = futureSlot();

    const holdRes = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId, start, end })
      .expect(201);
    expect(holdRes.body.reservationId).toBeTruthy();
    expect(holdRes.body.holdExpiresAt).toBeTruthy();

    const paymentId = randomUUID();
    const confirmRes = await request(app)
      .post('/api/booking/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId: holdRes.body.reservationId, paymentId })
      .expect(200);
    expect(confirmRes.body.status).toBe('CONFIRMED');

    const cancelRes = await request(app)
      .post(`/api/booking/${holdRes.body.reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelRes.body.status).toBe('CANCELLED');
    expect(typeof cancelRes.body.withoutPenalty).toBe('boolean');
  });

  it('rejects a double-booked slot on the same court with 409', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const { start, end } = futureSlot(5);

    await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId, start, end })
      .expect(201);

    const res = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId, start, end })
      .expect(409);
    expect(res.body.code).toBe('slot_not_available');
  });

  it("RBAC ownership: another non-staff player cannot cancel someone else's reservation, staff can", async () => {
    const owner = await seedVerifiedUser();
    const otherPlayer = await seedVerifiedUser();
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });

    const ownerToken = await login(app, owner.email, owner.password);
    const otherToken = await login(app, otherPlayer.email, otherPlayer.password);
    const staffToken = await login(app, staff.email, staff.password);

    const { start, end } = futureSlot(6);
    const holdRes = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ courtId, start, end })
      .expect(201);

    await request(app)
      .post(`/api/booking/${holdRes.body.reservationId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await request(app)
      .post(`/api/booking/${holdRes.body.reservationId}/cancel`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('privacy projection: anonymous sees "Ocupada" for PRIVATE, real label for CLASS, staff/owner see full detail', async () => {
    const owner = await seedVerifiedUser();
    const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
    const ownerToken = await login(app, owner.email, owner.password);
    const staffToken = await login(app, staff.email, staff.password);

    const { start, end } = futureSlot(7);
    const date = start.slice(0, 10);

    const holdRes = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ courtId, start, end })
      .expect(201);

    // Directly promote the PRIVATE hold to CLASS via Prisma to exercise the
    // institutional-label branch without needing a staff-console endpoint
    // (out of scope this phase -- see the Phase 2 plan).
    const classReservationId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO reservations (id, club_id, court_id, period, status, reservation_type, created_by, updated_at)
      VALUES (${classReservationId}::uuid, ${TEST_CLUB_ID}::uuid, ${courtId}::uuid,
              tstzrange(${new Date(new Date(start).getTime() + 2 * 60 * 60_000)}::timestamptz,
                        ${new Date(new Date(end).getTime() + 2 * 60 * 60_000)}::timestamptz, '[)'),
              'CONFIRMED', 'CLASS', ${owner.id}::uuid, now())
    `;

    const anonymousRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .expect(200);
    const anonPrivate = anonymousRes.body.reservations.find(
      (r) => r.courtId === courtId && r.label === 'Ocupada',
    );
    const anonClass = anonymousRes.body.reservations.find((r) => r.label === 'Clase');
    expect(anonPrivate).toBeTruthy();
    expect(anonPrivate.holderUserId).toBeUndefined();
    expect(anonClass).toBeTruthy();

    const ownerRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const ownerView = ownerRes.body.reservations.find((r) => r.id === holdRes.body.reservationId);
    expect(ownerView.holderUserId).toBe(owner.id);

    const staffRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    const staffView = staffRes.body.reservations.find((r) => r.id === holdRes.body.reservationId);
    expect(staffView.holderUserId).toBe(owner.id);
  });

  it('rejects an invalid slot (not exactly 60 minutes) with 400', async () => {
    const player = await seedVerifiedUser();
    const token = await login(app, player.email, player.password);
    const base = new Date();
    base.setUTCMinutes(0, 0, 0);
    const start = new Date(base.getTime() + 3 * 60 * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000); // 30 min, not 60

    const res = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${token}`)
      .send({ courtId, start: start.toISOString(), end: end.toISOString() })
      .expect(400);
    expect(res.body.code).toBe('invalid_time_slot');
  });
});
