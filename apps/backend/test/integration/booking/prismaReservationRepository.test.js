import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createPrismaReservationRepository } from '../../../src/modules/booking/infrastructure/persistence/prismaReservationRepository.js';
import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';
import { Reservation } from '../../../src/modules/booking/domain/entities/Reservation.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

describe('prismaReservationRepository (real Postgres)', () => {
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
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `booking-repo-${randomUUID()}@example.com`,
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

  it('createHold() + findById() round-trip', async () => {
    const created = await repo.createHold(buildHold());

    const found = await repo.findById(created.id);
    expect(found.status).toBe('HOLD');
    expect(found.courtId).toBe(courtId);
    expect(found.holderUserId).toBe(userId);
    expect(found.periodStart.toISOString()).toBe('2026-08-10T15:00:00.000Z');
    expect(found.periodEnd.toISOString()).toBe('2026-08-10T16:00:00.000Z');
  });

  it('findById() returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });

  it('listOccupyingByClubAndDateRange() returns HOLD/CONFIRMED reservations overlapping the range', async () => {
    await repo.createHold(buildHold());

    const inRange = await repo.listOccupyingByClubAndDateRange(
      TEST_CLUB_ID,
      new Date('2026-08-10T00:00:00Z'),
      new Date('2026-08-11T00:00:00Z'),
    );
    expect(inRange).toHaveLength(1);

    const outOfRange = await repo.listOccupyingByClubAndDateRange(
      TEST_CLUB_ID,
      new Date('2026-08-11T00:00:00Z'),
      new Date('2026-08-12T00:00:00Z'),
    );
    expect(outOfRange).toHaveLength(0);
  });

  it('countOccupyingByHolder() counts only HOLD/CONFIRMED reservations for that holder', async () => {
    expect(await repo.countOccupyingByHolder(userId)).toBe(0);

    const created = await repo.createHold(buildHold());
    expect(await repo.countOccupyingByHolder(userId)).toBe(1);

    await repo.transitionStatus({ id: created.id, fromStatuses: ['HOLD'], toStatus: 'CANCELLED' });
    expect(await repo.countOccupyingByHolder(userId)).toBe(0);
  });

  it('transitionStatus() succeeds only when the row is currently in fromStatuses', async () => {
    const created = await repo.createHold(buildHold());
    const paymentId = randomUUID(); // payment_id is a UUID column (no FK yet -- no billing module)

    const affected = await repo.transitionStatus({
      id: created.id,
      fromStatuses: ['HOLD'],
      toStatus: 'CONFIRMED',
      extra: { paymentId },
    });
    expect(affected).toBe(1);

    const found = await repo.findById(created.id);
    expect(found.status).toBe('CONFIRMED');
    expect(found.paymentId).toBe(paymentId);

    // Second attempt from the same (now-stale) fromStatuses list must no-op.
    const secondAttempt = await repo.transitionStatus({
      id: created.id,
      fromStatuses: ['HOLD'],
      toStatus: 'CONFIRMED',
    });
    expect(secondAttempt).toBe(0);
  });
});
