import './shared/bigintJson.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config/env.js';
import { logger } from './shared/logger.js';
import { toProblemDetail } from './shared/errors/httpError.js';
import { buildIdentityContainer } from './modules/identity/infrastructure/compositionRoot.js';
import { createAuthController } from './modules/identity/infrastructure/http/authController.js';
import { createAuthRoutes } from './modules/identity/infrastructure/http/authRoutes.js';
import { createRoleAdminController } from './modules/identity/infrastructure/http/roleAdminController.js';
import { createRoleAdminRoutes } from './modules/identity/infrastructure/http/adminRoutes.js';
import { buildBookingContainer } from './modules/booking/infrastructure/compositionRoot.js';
import { createBookingController } from './modules/booking/infrastructure/http/bookingController.js';
import { createBookingRoutes } from './modules/booking/infrastructure/http/bookingRoutes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: !config.isTest }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: config.nodeEnv });
  });

  const identityContainer = buildIdentityContainer();
  const authController = createAuthController(identityContainer);
  const roleAdminController = createRoleAdminController(identityContainer);

  app.use('/api/auth', createAuthRoutes(authController));
  app.use('/api/admin/roles', createRoleAdminRoutes(roleAdminController));

  const bookingContainer = buildBookingContainer();
  const bookingController = createBookingController(bookingContainer);
  app.use('/api/booking', createBookingRoutes(bookingController));

  // Other module routers are mounted here as each module is implemented.

  app.use((req, res) => {
    res.status(404).json({
      type: 'https://ctcj.co/errors/not_found',
      title: 'Not found',
      status: 404,
      code: 'not_found',
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const { status, body } = toProblemDetail(err);
    if (status >= 500) {
      req.log?.error({ err }, 'Unhandled error');
    }
    res.status(status).json(body);
  });

  return app;
}
