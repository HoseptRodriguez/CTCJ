import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createPrismaReservationRepository } from '../../../src/modules/booking/infrastructure/persistence/prismaReservationRepository.js';
import { createPrismaUserRepository } from '../../../src/modules/identity/infrastructure/persistence/prismaUserRepository.js';
import { User } from '../../../src/modules/identity/domain/entities/User.js';
import { Reservation } from '../../../src/modules/booking/domain/entities/Reservation.js';
import { SlotNotAvailable } from '../../../src/modules/booking/application/errors/SlotNotAvailable.js';
import { resetUsers } from '../identity/testDb.js';

import { prisma, resetReservations, TEST_CLUB_ID } from './testDb.js';

/**
 * Replicates v7's 7-case overlap-constraint verification, this time through
 * the actual repository layer (Phase 1 only verified the raw SQL directly
 * via manual psql) -- proving prismaReservationRepository.createHold()
 * correctly translates a Postgres exclusion violation into SlotNotAvailable.
 */
describe('reservation_no_overlap exclusion constraint, via the repository (real Postgres)', () => {
  const repo = createPrismaReservationRepository(prisma);
  const userRepo = createPrismaUserRepository(prisma);
  let userId;
  let courtA;
  let courtB;

  beforeAll(async () => {
    const courts = await prisma.court.findMany({ where: { clubId: TEST_CLUB_ID }, take: 2 });
    [courtA, courtB] = courts;
  });

  beforeEach(async () => {
    await resetReservations();
    await resetUsers();
    const user = User.registerPublic({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      email: `overlap-${randomUUID()}@example.com`,
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

  function reservation({ courtId = courtA.id, status, start, end }) {
    return new Reservation({
      id: randomUUID(),
      clubId: TEST_CLUB_ID,
      courtId,
      periodStart: start,
      periodEnd: end,
      status,
      reservationType: 'PRIVATE',
      holderUserId: userId,
      createdBy: userId,
      holdExpiresAt: status === 'HOLD' ? new Date(start.getTime() - 60_000) : null,
    });
  }

  it('case 1: rejects an identical period on the same court, both CONFIRMED', async () => {
    const start = new Date('2026-08-01T10:00:00Z');
    const end = new Date('2026-08-01T11:00:00Z');
    await repo.createHold(reservation({ status: 'CONFIRMED', start, end }));

    await expect(repo.createHold(reservation({ status: 'CONFIRMED', start, end }))).rejects.toThrow(
      SlotNotAvailable,
    );
  });

  it('case 2: rejects an overlapping-but-not-identical period on the same court', async () => {
    await repo.createHold(
      reservation({
        status: 'CONFIRMED',
        start: new Date('2026-08-02T10:00:00Z'),
        end: new Date('2026-08-02T11:00:00Z'),
      }),
    );

    await expect(
      repo.createHold(
        reservation({
          status: 'CONFIRMED',
          start: new Date('2026-08-02T10:30:00Z'),
          end: new Date('2026-08-02T11:30:00Z'),
        }),
      ),
    ).rejects.toThrow(SlotNotAvailable);
  });

  it('case 3: rejects HOLD overlapping an existing CONFIRMED reservation', async () => {
    await repo.createHold(
      reservation({
        status: 'CONFIRMED',
        start: new Date('2026-08-03T10:00:00Z'),
        end: new Date('2026-08-03T11:00:00Z'),
      }),
    );

    await expect(
      repo.createHold(
        reservation({
          status: 'HOLD',
          start: new Date('2026-08-03T10:30:00Z'),
          end: new Date('2026-08-03T11:30:00Z'),
        }),
      ),
    ).rejects.toThrow(SlotNotAvailable);
  });

  it('case 4: allows an overlapping period when the existing reservation is CANCELLED', async () => {
    await repo.createHold(
      reservation({
        status: 'CANCELLED',
        start: new Date('2026-08-04T10:00:00Z'),
        end: new Date('2026-08-04T11:00:00Z'),
      }),
    );

    await expect(
      repo.createHold(
        reservation({
          status: 'CONFIRMED',
          start: new Date('2026-08-04T10:30:00Z'),
          end: new Date('2026-08-04T11:30:00Z'),
        }),
      ),
    ).resolves.toBeTruthy();
  });

  it('case 5: allows an overlapping period when the existing reservation is EXPIRED', async () => {
    await repo.createHold(
      reservation({
        status: 'EXPIRED',
        start: new Date('2026-08-05T10:00:00Z'),
        end: new Date('2026-08-05T11:00:00Z'),
      }),
    );

    await expect(
      repo.createHold(
        reservation({
          status: 'CONFIRMED',
          start: new Date('2026-08-05T10:30:00Z'),
          end: new Date('2026-08-05T11:30:00Z'),
        }),
      ),
    ).resolves.toBeTruthy();
  });

  it('case 6: allows an identical period on a different court', async () => {
    const start = new Date('2026-08-06T10:00:00Z');
    const end = new Date('2026-08-06T11:00:00Z');
    await repo.createHold(reservation({ courtId: courtA.id, status: 'CONFIRMED', start, end }));

    await expect(
      repo.createHold(reservation({ courtId: courtB.id, status: 'CONFIRMED', start, end })),
    ).resolves.toBeTruthy();
  });

  it('case 7: allows adjacent, non-overlapping periods on the same court', async () => {
    await repo.createHold(
      reservation({
        status: 'CONFIRMED',
        start: new Date('2026-08-07T10:00:00Z'),
        end: new Date('2026-08-07T11:00:00Z'),
      }),
    );

    await expect(
      repo.createHold(
        reservation({
          status: 'CONFIRMED',
          start: new Date('2026-08-07T11:00:00Z'),
          end: new Date('2026-08-07T12:00:00Z'),
        }),
      ),
    ).resolves.toBeTruthy();
  });
});
