import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createExpireHoldsJob } from '../../../src/modules/booking/infrastructure/jobs/expireHoldsJob.js';
import { createPrismaReservationRepository } from '../../../src/modules/booking/infrastructure/persistence/prismaReservationRepository.js';
import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';
import { Reservation } from '../../../src/modules/booking/domain/entities/Reservation.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

const LOCK_NAME = 'booking-expire-holds';

async function resetLock() {
  await prisma.shedLock.deleteMany({ where: { name: LOCK_NAME } });
}

describe('expireHoldsJob (real Postgres + shedlock)', () => {
  const repo = createPrismaReservationRepository(prisma);
  const userRepo = createPrismaUserRepository(prisma);
  let userId;
  let courtId;
  const NOW = new Date('2026-08-01T10:00:00Z');

  beforeAll(async () => {
    const court = await prisma.court.findFirstOrThrow({ where: { clubId: TEST_CLUB_ID } });
    courtId = court.id;
  });

  beforeEach(async () => {
    await resetReservations();
    await resetUsers();
    await resetLock();
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `job-${randomUUID()}@example.com`,
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Gomez',
    });
    await userRepo.create(user);
    userId = user.id;
  });
  afterEach(async () => {
    await resetReservations();
    await resetUsers();
    await resetLock();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  function buildHold(overrides = {}) {
    return Reservation.createHold({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      courtId,
      periodStart: new Date('2026-08-10T15:00:00Z'),
      periodEnd: new Date('2026-08-10T16:00:00Z'),
      holderUserId: userId,
      createdBy: userId,
      now: NOW,
      ...overrides,
    });
  }

  it('runOnce() expires a HOLD past its holdExpiresAt', async () => {
    const created = await repo.createHold(buildHold());
    const job = createExpireHoldsJob({
      prismaClient: prisma,
      clock: { now: () => new Date(NOW.getTime() + 6 * 60_000) }, // 6 min later, past the 5-min hold
      lockedBy: 'test-instance-1',
    });

    const result = await job.runOnce();
    expect(result).toEqual({ acquired: true, expiredCount: 1 });

    const found = await repo.findById(created.id);
    expect(found.status).toBe('EXPIRED');
  });

  it('runOnce() leaves a not-yet-expired HOLD untouched', async () => {
    const created = await repo.createHold(buildHold());
    const job = createExpireHoldsJob({
      prismaClient: prisma,
      clock: { now: () => new Date(NOW.getTime() + 60_000) }, // 1 min later, still within the 5-min hold
      lockedBy: 'test-instance-1',
    });

    const result = await job.runOnce();
    expect(result.expiredCount).toBe(0);

    const found = await repo.findById(created.id);
    expect(found.status).toBe('HOLD');
  });

  it('does not touch CONFIRMED reservations even if hold_expires_at (historical) is in the past', async () => {
    const created = await repo.createHold(buildHold());
    await repo.transitionStatus({ id: created.id, fromStatuses: ['HOLD'], toStatus: 'CONFIRMED' });

    const job = createExpireHoldsJob({
      prismaClient: prisma,
      clock: { now: () => new Date(NOW.getTime() + 6 * 60_000) },
      lockedBy: 'test-instance-1',
    });
    await job.runOnce();

    const found = await repo.findById(created.id);
    expect(found.status).toBe('CONFIRMED');
  });

  it('a second instance cannot acquire the lock while the first still holds it', async () => {
    // Deterministic instead of racing two runOnce() calls via Promise.all:
    // JS-level "concurrency" through a shared connection pool doesn't
    // guarantee true simultaneity (whichever call gets a connection first
    // may finish -- and release -- before the second is even dispatched),
    // so that approach can't reliably distinguish "mutual exclusion held"
    // from "sequential turns, pool-queuing-dependent". Instead, directly
    // simulate an in-progress instance A (an unexpired lock row) and prove
    // instance B is rejected while A's lock is still valid, then succeeds
    // once it lapses -- exactly the property that matters in production.
    await prisma.shedLock.create({
      data: {
        name: LOCK_NAME,
        lockUntil: new Date(Date.now() + 30_000),
        lockedAt: new Date(),
        lockedBy: 'instance-A',
      },
    });

    const jobB = createExpireHoldsJob({
      prismaClient: prisma,
      clock: { now: () => NOW },
      lockedBy: 'instance-B',
    });
    const whileHeld = await jobB.runOnce();
    expect(whileHeld.acquired).toBe(false);

    await prisma.shedLock.update({
      where: { name: LOCK_NAME },
      data: { lockUntil: new Date(Date.now() - 1000) }, // simulate A's lock lapsing
    });
    const afterLapse = await jobB.runOnce();
    expect(afterLapse.acquired).toBe(true);
  });

  it('a subsequent tick can re-acquire the lock after the previous run released it', async () => {
    const job = createExpireHoldsJob({
      prismaClient: prisma,
      clock: { now: () => NOW },
      lockedBy: 'test-instance-1',
    });

    const first = await job.runOnce();
    expect(first.acquired).toBe(true);

    const second = await job.runOnce();
    expect(second.acquired).toBe(true);
  });
});
