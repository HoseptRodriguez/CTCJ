import { LEGAL_DOCUMENTS } from '@ctcj/shared';

import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './shared/prismaClient.js';
import { systemClock } from './modules/booking/application/ports/Clock.js';
import { createExpireHoldsJob } from './modules/booking/infrastructure/jobs/expireHoldsJob.js';
import { buildIdentityContainer } from './modules/identity/infrastructure/compositionRoot.js';

const app = createApp();
const identity = buildIdentityContainer();

// Store the legal text versions in force (proof of what people accept). In
// production a failure stops the start-up: the site must not run with
// legal texts whose accepted versions can't be proven.
try {
  const { inserted } = await identity.syncLegalDocuments({
    documents: LEGAL_DOCUMENTS,
  });
  if (inserted.length) logger.info({ inserted }, 'Legal document versions stored');
} catch (err) {
  if (config.isProduction) {
    logger.fatal({ err }, 'Could not store the legal document versions');
    process.exit(1);
  }
  logger.warn({ err: err.message }, 'Legal document versions not stored (development)');
}

// Demo data is never shown in production: with demonstration accounts
// (users.is_demo) in the database, the production server does not start.
if (config.isProduction) {
  const demoAccounts = await identity.countDemoAccounts();
  if (demoAccounts > 0) {
    logger.fatal(
      { demoAccounts },
      'Demonstration accounts (is_demo) found: delete or anonymize them before starting in production',
    );
    process.exit(1);
  }
}

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
