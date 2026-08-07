import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ROLE_CODES, MEMBERSHIP_STATUS } from '@ctcj/shared';

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

// Club-local (America/Bogota, fixed UTC-5) calendar date for a given instant
// -- matches booking's own resolveClubDayRangeUtc(), where local midnight is
// 05:00 UTC. `isoString.slice(0, 10)` (the UTC date) is wrong here: a slot at
// e.g. 01:00 UTC is still the *previous* Bogota day, not the same one --
// this only shows up when a test happens to run close enough to UTC midnight
// for a futureSlot() offset to cross that boundary.
function bogotaDateKey(isoString) {
  const bogotaMs = new Date(isoString).getTime() - 5 * 60 * 60_000;
  return new Date(bogotaMs).toISOString().slice(0, 10);
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

    const confirmRes = await request(app)
      .post('/api/booking/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId: holdRes.body.reservationId })
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
    const date = bogotaDateKey(start);

    const holdRes = await request(app)
      .post('/api/booking/hold')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ courtId, start, end })
      .expect(201);

    // Directly promote the PRIVATE hold to CLASS via Prisma to exercise the
    // institutional-label branch without needing a staff-console endpoint
    // (out of scope this phase -- see the Phase 2 plan).
    const classStart = new Date(new Date(start).getTime() + 2 * 60 * 60_000);
    const classEnd = new Date(new Date(end).getTime() + 2 * 60 * 60_000);
    // The +2h offset can itself cross the club-local midnight boundary
    // independently of `date` (e.g. start is just before 05:00 UTC on one
    // Bogota day, classStart lands just after it, on the next) -- query
    // whichever club-local day the class reservation actually falls on too.
    const classDate = bogotaDateKey(classStart.toISOString());
    const classReservationId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO reservations (id, club_id, court_id, period, status, reservation_type, created_by, updated_at)
      VALUES (${classReservationId}::uuid, ${TEST_CLUB_ID}::uuid, ${courtId}::uuid,
              tstzrange(${classStart}::timestamptz, ${classEnd}::timestamptz, '[)'),
              'CONFIRMED', 'CLASS', ${owner.id}::uuid, now())
    `;

    const anonymousRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .expect(200);
    const anonPrivate = anonymousRes.body.reservations.find(
      (r) => r.courtId === courtId && r.label === 'Ocupada',
    );
    expect(anonPrivate).toBeTruthy();
    expect(anonPrivate.holderUserId).toBeUndefined();

    const anonymousClassRes =
      classDate === date
        ? anonymousRes
        : await request(app).get('/api/booking/schedule').query({ date: classDate }).expect(200);
    const anonClass = anonymousClassRes.body.reservations.find((r) => r.label === 'Clase');
    expect(anonClass).toBeTruthy();

    const ownerRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const ownerView = ownerRes.body.reservations.find((r) => r.id === holdRes.body.reservationId);
    expect(ownerView.holderUserId).toBe(owner.id);
    expect(ownerView.isOwnBooking).toBe(true);

    const staffRes = await request(app)
      .get('/api/booking/schedule')
      .query({ date })
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    const staffView = staffRes.body.reservations.find((r) => r.id === holdRes.body.reservationId);
    expect(staffView.holderUserId).toBe(owner.id);
    // Staff sees full detail via their role privilege, but this isn't *their*
    // booking -- isOwnBooking must stay false, or the staff console's own
    // grid would highlight every reservation as "mine".
    expect(staffView.isOwnBooking).toBe(false);
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

  describe('cobro asistido (Phase 4)', () => {
    afterEach(async () => {
      // Courts are seed data, not reset by resetReservations() -- clear the
      // price explicitly so one test's PUT never leaks into the next.
      await prisma.court.update({ where: { id: courtId }, data: { defaultPriceCop: null } });
    });

    it('PUT /courts/:id/price: ADMINISTRADOR can set it, RECEPCION cannot', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);

      const res = await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);
      expect(res.body).toEqual({ courtId, priceCop: 60000 });

      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ priceCop: 70000 })
        .expect(403);
    });

    it('full flow: price -> hold -> confirm (no paymentId) -> pay -> schedule shows paymentId to staff', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);

      const { start, end } = futureSlot(8);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      expect(holdRes.body.priceCop).toBe(60000); // BigInt survives res.json()

      await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);

      const payRes = await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'CASH' })
        .expect(201);
      expect(payRes.body).toMatchObject({
        reservationId: holdRes.body.reservationId,
        amountCop: 60000,
        method: 'CASH',
      });
      expect(payRes.body.paymentId).toBeTruthy();

      const date = bogotaDateKey(start);
      const scheduleRes = await request(app)
        .get('/api/booking/schedule')
        .query({ date })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      const projected = scheduleRes.body.reservations.find(
        (r) => r.id === holdRes.body.reservationId,
      );
      expect(projected.paymentId).toBe(payRes.body.paymentId);
    });

    it('rejects a second payment on an already-paid reservation with 409', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);

      const { start, end } = futureSlot(9);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);

      await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'CASH' })
        .expect(201);

      const res = await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'TRANSFER' })
        .expect(409);
      expect(res.body.code).toBe('reservation_already_paid');
    });

    it('rejects payment on a HOLD reservation (not yet confirmed) with 409', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);

      const { start, end } = futureSlot(10);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);

      const res = await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'CASH' })
        .expect(409);
      expect(res.body.code).toBe('invalid_reservation_state');
    });

    it('rejects payment when the court has no price set with 409', async () => {
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      const { start, end } = futureSlot(11); // no price set on this court -- afterEach keeps it null
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);

      const res = await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'CASH' })
        .expect(409);
      expect(res.body.code).toBe('reservation_has_no_price');
    });

    it('rejects payment from a non-staff caller with 403', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);

      const { start, end } = futureSlot(12);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);

      await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ method: 'CASH' })
        .expect(403);
    });
  });

  describe('financial reporting (Phase 9)', () => {
    afterEach(async () => {
      await prisma.court.update({ where: { id: courtId }, data: { defaultPriceCop: null } });
    });

    async function payForAReservation(hoursFromNow, adminToken, staffToken, playerToken) {
      await request(app)
        .put(`/api/booking/courts/${courtId}/price`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCop: 60000 })
        .expect(200);

      const { start, end } = futureSlot(hoursFromNow);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);
      await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/payment`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ method: 'CASH' })
        .expect(201);
    }

    it('GET /payments totals only what was recorded today, STAFF_ROLES only', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await payForAReservation(13, adminToken, staffToken, playerToken);
      await payForAReservation(14, adminToken, staffToken, playerToken);

      const today = bogotaDateKey(new Date().toISOString());
      const res = await request(app)
        .get('/api/booking/payments')
        .query({ from: today, to: today })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.count).toBe(2);
      expect(res.body.totalCop).toBe(120000);
      expect(res.body.payments).toHaveLength(2);

      await request(app).get('/api/booking/payments').query({ from: today, to: today }).expect(401);
      await request(app)
        .get('/api/booking/payments')
        .query({ from: today, to: today })
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('GET /payments excludes payments outside the requested range', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await payForAReservation(15, adminToken, staffToken, playerToken);

      const res = await request(app)
        .get('/api/booking/payments')
        .query({ from: '2020-01-01', to: '2020-01-01' })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body).toEqual({ payments: [], totalCop: 0, count: 0 });
    });

    describe('GET /payments/monthly (cash flow, Phase 16)', () => {
      it("buckets today's payment into the current club-local month, oldest month first, STAFF_ROLES only", async () => {
        const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
        const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
        const player = await seedVerifiedUser();
        const adminToken = await login(app, admin.email, admin.password);
        const staffToken = await login(app, staff.email, staff.password);
        const playerToken = await login(app, player.email, player.password);

        await payForAReservation(13, adminToken, staffToken, playerToken);
        await payForAReservation(14, adminToken, staffToken, playerToken);

        const res = await request(app)
          .get('/api/booking/payments/monthly')
          .query({ months: 3 })
          .set('Authorization', `Bearer ${staffToken}`)
          .expect(200);

        expect(res.body.months).toHaveLength(3);
        const currentMonth = res.body.months[2];
        expect(currentMonth.totalCop).toBe(120000);
        expect(currentMonth.count).toBe(2);
        expect(res.body.months[0].totalCop).toBe(0);
        expect(res.body.months[1].totalCop).toBe(0);

        await request(app).get('/api/booking/payments/monthly').expect(401);
        await request(app)
          .get('/api/booking/payments/monthly')
          .set('Authorization', `Bearer ${playerToken}`)
          .expect(403);
      });

      it('defaults months to 6 when not provided', async () => {
        const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
        const adminToken = await login(app, admin.email, admin.password);

        const res = await request(app)
          .get('/api/booking/payments/monthly')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.months).toHaveLength(6);
      });
    });
  });

  describe('membership overdue booking block (Phase 5)', () => {
    afterEach(async () => {
      // The overdue-policy toggle is a club-wide SystemSetting, not reset by
      // resetUsers()/resetReservations() -- clear it explicitly so one test's
      // enable/OVERDUE state never leaks into the next.
      await prisma.systemSetting.deleteMany({ where: { key: 'booking.blockOnOverdueMembership' } });
    });

    it('full flow: policy off allows booking an OVERDUE player; enabling blocks with 403; disabling restores it', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const adminToken = await login(app, admin.email, admin.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/admin/users/${player.id}/membership-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: MEMBERSHIP_STATUS.OVERDUE })
        .expect(200);

      // Policy defaults to off -- an OVERDUE player can still book.
      const policyRes = await request(app)
        .get('/api/booking/settings/overdue-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(policyRes.body).toEqual({ enabled: false });

      const { start, end } = futureSlot(13);
      const firstHold = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);
      const confirmRes = await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ reservationId: firstHold.body.reservationId })
        .expect(200);
      expect(confirmRes.body.status).toBe('CONFIRMED');

      // Enable the policy.
      await request(app)
        .put('/api/booking/settings/overdue-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true })
        .expect(200);

      const blockedSlot = futureSlot(14);
      const blockedRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start: blockedSlot.start, end: blockedSlot.end })
        .expect(403);
      expect(blockedRes.body.code).toBe('membership_overdue_booking_blocked');

      // The reservation confirmed before the policy was enabled is unaffected.
      const cancelRes = await request(app)
        .post(`/api/booking/${firstHold.body.reservationId}/cancel`)
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(200);
      expect(cancelRes.body.status).toBe('CANCELLED');

      // Disable the policy -- booking succeeds again.
      await request(app)
        .put('/api/booking/settings/overdue-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(200);

      const restoredSlot = futureSlot(15);
      await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start: restoredSlot.start, end: restoredSlot.end })
        .expect(201);
    });

    it('non-admin cannot read or write the overdue policy', async () => {
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const staffToken = await login(app, staff.email, staff.password);

      await request(app)
        .get('/api/booking/settings/overdue-policy')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
      await request(app)
        .put('/api/booking/settings/overdue-policy')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ enabled: true })
        .expect(403);
    });

    it('staff schedule view includes holderMembershipStatus, anonymous view does not', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const staff = await seedVerifiedUser({ roleCode: ROLE_CODES.RECEPCION });
      const player = await seedVerifiedUser({ roleCode: ROLE_CODES.JUGADOR });
      const adminToken = await login(app, admin.email, admin.password);
      const staffToken = await login(app, staff.email, staff.password);
      const playerToken = await login(app, player.email, player.password);

      await request(app)
        .put(`/api/admin/users/${player.id}/membership-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: MEMBERSHIP_STATUS.OVERDUE })
        .expect(200);

      const { start, end } = futureSlot(16);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ courtId, start, end })
        .expect(201);

      const date = bogotaDateKey(start);
      const staffRes = await request(app)
        .get('/api/booking/schedule')
        .query({ date })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
      const staffView = staffRes.body.reservations.find((r) => r.id === holdRes.body.reservationId);
      expect(staffView.holderMembershipStatus).toBe(MEMBERSHIP_STATUS.OVERDUE);

      const anonRes = await request(app).get('/api/booking/schedule').query({ date }).expect(200);
      const anonView = anonRes.body.reservations.find((r) => r.courtId === courtId);
      expect(anonView).toBeTruthy();
      expect(anonView.holderMembershipStatus).toBeUndefined();
    });
  });

  describe('guardian booking for a linked minor (Phase 6)', () => {
    async function approveGuardianship(adminToken, guardianToken, minorEmail, canBook = true) {
      const requestRes = await request(app)
        .post('/api/identity/me/guardianships')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ minorEmail, canPay: false, canBook })
        .expect(201);
      await request(app)
        .put(`/api/admin/guardianships/${requestRes.body.id}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVED' })
        .expect(200);
    }

    it('end-to-end: an approved+canBook guardian can hold, and createdBy differs from holderUserId', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const guardian = await seedVerifiedUser();
      const minor = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const guardianToken = await login(app, guardian.email, guardian.password);

      await approveGuardianship(adminToken, guardianToken, minor.email);

      const { start, end } = futureSlot(17);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ courtId, start, end, holderUserId: minor.id })
        .expect(201);
      expect(holdRes.body.reservationId).toBeTruthy();

      const date = bogotaDateKey(start);
      const staffOrOwnerRes = await request(app)
        .get('/api/booking/schedule')
        .query({ date })
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);
      const view = staffOrOwnerRes.body.reservations.find(
        (r) => r.id === holdRes.body.reservationId,
      );
      // The guardian (creator, not holder) still sees full detail, not the
      // anonymized shape -- otherwise they could never find their own booking again.
      expect(view.holderUserId).toBe(minor.id);
      expect(view.label).toBeUndefined();
      // And the client can tell it's theirs (BookingGrid's "mine" highlight)
      // without comparing holderUserId to their own id, which would be false here.
      expect(view.isOwnBooking).toBe(true);
    });

    it('without an approved guardianship, booking for someone else is rejected with 403', async () => {
      const guardian = await seedVerifiedUser();
      const minor = await seedVerifiedUser();
      const guardianToken = await login(app, guardian.email, guardian.password);

      const { start, end } = futureSlot(18);
      const res = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ courtId, start, end, holderUserId: minor.id })
        .expect(403);
      expect(res.body.code).toBe('not_authorized_to_book_for_user');
    });

    it('the guardian can confirm and cancel the reservation they created for the minor', async () => {
      const admin = await seedVerifiedUser({ roleCode: ROLE_CODES.ADMINISTRADOR });
      const guardian = await seedVerifiedUser();
      const minor = await seedVerifiedUser();
      const adminToken = await login(app, admin.email, admin.password);
      const guardianToken = await login(app, guardian.email, guardian.password);

      await approveGuardianship(adminToken, guardianToken, minor.email);

      const { start, end } = futureSlot(19);
      const holdRes = await request(app)
        .post('/api/booking/hold')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ courtId, start, end, holderUserId: minor.id })
        .expect(201);

      const confirmRes = await request(app)
        .post('/api/booking/confirm')
        .set('Authorization', `Bearer ${guardianToken}`)
        .send({ reservationId: holdRes.body.reservationId })
        .expect(200);
      expect(confirmRes.body.status).toBe('CONFIRMED');

      const cancelRes = await request(app)
        .post(`/api/booking/${holdRes.body.reservationId}/cancel`)
        .set('Authorization', `Bearer ${guardianToken}`)
        .expect(200);
      expect(cancelRes.body.status).toBe('CANCELLED');
    });
  });
});
