import { logger, errorForLog } from '../../../../shared/logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Once a day: deletes discarded or never-answered requests older than the
 * period the club defines (INFO_REQUEST_RETENTION_MONTHS). Without it, the
 * job does nothing.
 *
 * @param {{ purgeOldInfoRequests: Function, months: number|null }} deps
 */
export function createPurgeInfoRequestsJob({ purgeOldInfoRequests, months }) {
  async function runOnce() {
    const { deleted } = await purgeOldInfoRequests({ months });
    if (deleted) logger.info({ deleted }, 'Old info requests deleted');
  }
  return {
    runOnce,
    start() {
      if (!months) return { stop() {} };
      const tick = () =>
        runOnce().catch((err) =>
          logger.error({ err: errorForLog(err) }, 'purgeInfoRequests failed'),
        );
      tick();
      const handle = setInterval(tick, DAY_MS);
      handle.unref();
      return { stop: () => clearInterval(handle) };
    },
  };
}
