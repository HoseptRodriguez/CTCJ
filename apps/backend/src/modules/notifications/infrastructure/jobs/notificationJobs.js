import { clubDateOf } from '@ctcj/shared';

import { errorForLog, logger } from '../../../../shared/logger.js';

const MINUTE_MS = 60 * 1000;

/**
 * Every minute: publishes the announcements whose time came, delivers the
 * outbox events, and sends the due emails. Once a day, at the digest hour
 * (club time), builds the daily digests. Each step is independent: one
 * failing never stops the others.
 *
 * @param {{ container: ReturnType<typeof import('../compositionRoot.js').buildNotificationsContainer>,
 *   digestHour: number, clock?: { now: () => Date } }} deps
 */
export function createNotificationJobs({
  container,
  digestHour,
  clock = { now: () => new Date() },
}) {
  let lastDigestDate = null;
  let running = false;

  async function step(name, fn) {
    try {
      const result = await fn();
      if (result && Object.values(result).some((v) => (Array.isArray(v) ? v.length : v))) {
        logger.info({ result }, `notifications: ${name}`);
      }
    } catch (err) {
      logger.error({ err: errorForLog(err) }, `notifications: ${name} failed`);
    }
  }

  async function runOnce() {
    if (running) return;
    running = true;
    try {
      await step('announcements published', async () => ({
        published: await container.publishDueAnnouncements(),
      }));
      await step('outbox', () => container.processOutbox());
      const now = clock.now();
      const today = clubDateOf(now);
      const clubHour = new Date(now.getTime() - 5 * 60 * 60 * 1000).getUTCHours();
      if (clubHour >= digestHour && lastDigestDate !== today) {
        lastDigestDate = today;
        await step('daily digests', () => container.sendDailyDigests());
      }
      await step('emails', () => container.sendDueEmails());
    } finally {
      running = false;
    }
  }

  return {
    runOnce,
    start() {
      const handle = setInterval(runOnce, MINUTE_MS);
      handle.unref();
      runOnce();
      return { stop: () => clearInterval(handle) };
    },
  };
}
