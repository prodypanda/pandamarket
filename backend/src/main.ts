import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { logger } from './utils/logger';
import { accessLog, apiRateLimit, errorHandler, requestId } from './middlewares';
import { csrfProtection } from './middlewares/csrf.middleware';

import { getPool } from './db/pool';
import { getRedis } from './db/redis';

// Routers
import authRouter from './api/auth.route';
import storeRouter from './api/store.route';
import productRouter from './api/product.route';
import orderRouter from './api/order.route';
import paymentRouter from './api/payment.route';
import walletRouter from './api/wallet.route';
import subscriptionRouter from './api/subscription.route';
import verificationRouter from './api/verification.route';
import aiRouter from './api/ai.route';
import reportRouter from './api/report.route';
import searchRouter from './api/search.route';
import internalRouter from './api/internal.route';
import filesRouter from './api/files.route';
import adminRouter from './api/admin.route';
import notificationRouter from './api/notification.route';
import creditsRouter from './api/credits.route';
import categoriesRouter from './api/categories.route';

async function bootstrap() {
  // Validate DB and Redis connection
  try {
    const dbPool = getPool();
    const client = await dbPool.connect();
    client.release();
    logger.info('Database connected successfully.');

    await getRedis().ping();
    logger.info('Redis connected successfully.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to backend dependencies.');
    process.exit(1);
  }

  const app = express();

  app.set('trust proxy', 1);

  // Security middlewares
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            config.s3.publicBaseUrl,
            '*.r2.cloudflarestorage.com',
            'https://picsum.photos',
          ],
          connectSrc: [
            "'self'",
            config.meili.host,
            config.s3.endpoint,
            'https://developers.flouci.com',
            'https://api.konnect.network',
            'https://api.preprod.konnect.network',
          ],
          frameSrc: [
            "'self'",
            'https://flouci.com',
            'https://pay.konnect.network',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed = [...config.adminCors, ...config.storeCors];
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // In production, never allow wildcard
        if (config.env === 'production' && allowed.includes('*')) {
          return callback(new Error('Wildcard CORS origin not allowed in production'));
        }
        if (allowed.includes(origin) || allowed.some((a) => origin.endsWith(a.replace('*', '')))) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.cookieSecret));

  // Base Middlewares
  app.use(requestId);
  app.use(accessLog);
  app.use(apiRateLimit);
  app.use(csrfProtection);

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/stores', storeRouter);
  apiRouter.use('/products', productRouter);
  apiRouter.use('/orders', orderRouter);
  apiRouter.use('/payments', paymentRouter);
  apiRouter.use('/wallet', walletRouter);
  apiRouter.use('/subscriptions', subscriptionRouter);
  apiRouter.use('/verification', verificationRouter);
  apiRouter.use('/ai', aiRouter);
  apiRouter.use('/reports', reportRouter);
  apiRouter.use('/search', searchRouter);
  apiRouter.use('/internal', internalRouter);
  apiRouter.use('/files', filesRouter);
  apiRouter.use('/admin', adminRouter);
  apiRouter.use('/notifications', notificationRouter);
  apiRouter.use('/credits', creditsRouter);
  apiRouter.use('/categories', categoriesRouter);

  app.use('/api/pd', apiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  const port = config.port;
  app.listen(port, () => {
    logger.info(`Server listening on port ${port} in ${config.env} mode.`);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start the application');
  process.exit(1);
});
