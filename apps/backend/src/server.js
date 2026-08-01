import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './shared/prismaClient.js';
import { systemClock } from './modules/booking/application/ports/Clock.js';
import { createExpireHoldsJob } from './modules/booking/infrastructure/jobs/expireHoldsJob.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`CTCJ backend listening on port ${config.port} (${config.nodeEnv})`);
});

// Guarded by isTest so it never fires during Vitest runs, which construct
// their own createApp() instances repeatedly (see expireHoldsJob.test.js
// for the job's own direct runOnce() coverage).
const expireHoldsJob = config.isTest
  ? null
  : createExpireHoldsJob({ prismaClient: prisma, clock: systemClock, lockedBy: `${process.pid}` });
const expireHoldsJobHandle = expireHoldsJob?.start() ?? null;

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully.`);
  expireHoldsJobHandle?.stop();
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
