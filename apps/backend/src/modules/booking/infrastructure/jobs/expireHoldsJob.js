import os from 'node:os';

import { RESERVATION_STATUS } from '@ctcj/shared';

import { logger } from '../../../../shared/logger.js';

const LOCK_NAME = 'booking-expire-holds';
const LOCK_AT_MOST_MS = 50_000; // < TICK_MS, so a crashed process's lock self-releases before the next tick
const TICK_MS = 60_000;

/**
 * Sweeps stale HOLD reservations to EXPIRED on a fixed interval, guarded by
 * the shedlock table so only one running instance does the work at a time
 * -- horizontally-scale-safe later even though one instance runs today.
 * setInterval rather than a cron library: the schedule is a fixed "every 60
 * seconds," which setInterval already expresses natively.
 */
export function createExpireHoldsJob({
  prismaClient,
  clock,
  lockedBy = `${os.hostname()}:${process.pid}`,
}) {
  async function tryAcquireLock() {
    const rows = await prismaClient.$queryRaw`
      INSERT INTO shedlock (name, lock_until, locked_at, locked_by)
      VALUES (${LOCK_NAME}, now() + (${LOCK_AT_MOST_MS} * interval '1 millisecond'), now(), ${lockedBy})
      ON CONFLICT (name) DO UPDATE
        SET lock_until = now() + (${LOCK_AT_MOST_MS} * interval '1 millisecond'),
            locked_at = now(),
            locked_by = ${lockedBy}
        WHERE shedlock.lock_until <= now()
      RETURNING name
    `;
    return rows.length === 1;
  }

  async function releaseLock() {
    await prismaClient.$executeRaw`
      UPDATE shedlock SET lock_until = now() WHERE name = ${LOCK_NAME} AND locked_by = ${lockedBy}
    `;
  }

  /** @returns {Promise<{ acquired: boolean, expiredCount: number }>} */
  async function runOnce() {
    const acquired = await tryAcquireLock();
    if (!acquired) {
      return { acquired: false, expiredCount: 0 };
    }

    try {
      const { count } = await prismaClient.reservation.updateMany({
        where: { status: RESERVATION_STATUS.HOLD, holdExpiresAt: { lt: clock.now() } },
        data: { status: RESERVATION_STATUS.EXPIRED },
      });
      if (count > 0) {
        logger.info({ count }, 'Expired stale HOLD reservations');
      }
      return { acquired: true, expiredCount: count };
    } finally {
      await releaseLock();
    }
  }

  function start() {
    const timer = setInterval(() => {
      runOnce().catch((err) => logger.error({ err }, 'expireHoldsJob tick failed'));
    }, TICK_MS);
    timer.unref();
    return { stop: () => clearInterval(timer) };
  }

  return { start, runOnce };
}
