import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { getDataDir } from './utils/data-dir';
import { accessLog, apiRateLimit, errorHandler, requestId } from './middlewares';
import { csrfProtection } from './middlewares/csrf.middleware';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware';
import { auditLog } from './middlewares/audit-log.middleware';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './utils/sentry';
import { metricsMiddleware, metricsRouter, logMetricsStatus } from './utils/metrics';

import { getPool } from './db/pool';
import { getRedis } from './db/redis';

// Routers
import authRouter from './api/auth.route';
import storefrontAuthRouter from './api/storefront-auth.route';
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
import marketplaceRouter from './api/marketplace.route';
import vendorRouter from './api/vendor.route';
import shippingRouter from './api/shipping.route';
import themeRouter from './api/theme.route';
import pageBuilderRouter from './api/page-builder.route';
import reviewRouter from './api/review.route';
import wishlistRouter from './api/wishlist.route';
import addressRouter from './api/address.route';
import chatRouter from './api/chat.route';
import analyticsRouter from './api/analytics.route';
import emailTemplateRouter from './api/email-template.route';
import supportRouter from './api/support.route';
import { socketGateway } from './realtime/socket-gateway';
import { registerAllSubscribers } from './subscribers';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

async function bootstrap() {
  // Initialise Sentry (no-op if DSN not configured)
  await initSentry();
  logMetricsStatus();

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

  // Sentry request handler (must be first middleware)
  app.use(sentryRequestHandler());

  // Prometheus metrics
  app.use(metricsMiddleware);
  app.use(metricsRouter());

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
  
  // Serve public uploads and themes statically from backend/data.
  // getDataDir() resolves correctly for both tsx dev mode (src/) and the
  // compiled production build (dist/backend/src/), unlike __dirname-relative paths.
  app.use('/pd-product-images', express.static(path.join(getDataDir(), 'pd-product-images')));
  app.use('/pd-themes', express.static(path.join(getDataDir(), 'pd-themes')));

  // Base Middlewares
  app.use(requestId);
  app.use(accessLog);
  app.use(apiRateLimit);
  app.use(csrfProtection);
  app.use(maintenanceMiddleware());
  app.use(auditLog);

  // API Routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/storefront/auth', storefrontAuthRouter);
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
  apiRouter.use('/marketplace', marketplaceRouter);
  apiRouter.use('/vendor', vendorRouter);
  apiRouter.use('/shipping', shippingRouter);
  apiRouter.use('/themes', themeRouter);
  apiRouter.use('/page-builder', pageBuilderRouter);
  apiRouter.use('/reviews', reviewRouter);
  apiRouter.use('/wishlist', wishlistRouter);
  apiRouter.use('/addresses', addressRouter);
  apiRouter.use('/chats', chatRouter);
  apiRouter.use('/analytics', analyticsRouter);
  apiRouter.use('/email-templates', emailTemplateRouter);
  apiRouter.use('/support', supportRouter);

  app.use('/api/pd', apiRouter);

  // Swagger API documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PandaMarket API Documentation',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // Health check (liveness)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness check (all dependencies reachable)
  app.get('/ready', async (_req, res) => {
    const checks: Record<string, { status: string; latency_ms?: number }> = {};
    let allHealthy = true;

    // PostgreSQL
    try {
      const start = Date.now();
      const dbPool = getPool();
      const client = await dbPool.connect();
      await client.query('SELECT 1');
      client.release();
      checks.postgres = { status: 'ok', latency_ms: Date.now() - start };
    } catch {
      checks.postgres = { status: 'error' };
      allHealthy = false;
    }

    // Redis
    try {
      const start = Date.now();
      await getRedis().ping();
      checks.redis = { status: 'ok', latency_ms: Date.now() - start };
    } catch {
      checks.redis = { status: 'error' };
      allHealthy = false;
    }

    // Meilisearch
    try {
      const start = Date.now();
      const meiliRes = await fetch(`${config.meili.host}/health`, { signal: AbortSignal.timeout(5000) });
      if (meiliRes.ok) {
        checks.meilisearch = { status: 'ok', latency_ms: Date.now() - start };
      } else {
        checks.meilisearch = { status: 'error' };
        allHealthy = false;
      }
    } catch {
      checks.meilisearch = { status: 'error' };
      allHealthy = false;
    }

    // MinIO / S3
    try {
      const start = Date.now();
      const s3Res = await fetch(`${config.s3.endpoint}/minio/health/live`, { signal: AbortSignal.timeout(5000) });
      if (s3Res.ok) {
        checks.s3 = { status: 'ok', latency_ms: Date.now() - start };
      } else {
        checks.s3 = { status: 'degraded' };
      }
    } catch {
      checks.s3 = { status: 'degraded' }; // S3 not critical for readiness
    }

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json({
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Sentry error handler (must be before custom error handler)
  app.use(sentryErrorHandler());

  // Error handler
  app.use(errorHandler);

  const port = config.port;
  const server = app.listen(port, () => {
    logger.info(`Server listening on port ${port} in ${config.env} mode.`);
  });

  // Attach WebSocket gateway for real-time notifications
  socketGateway.attach(server);

  // Register event subscribers (notifications, wallet credits, search sync, webhooks)
  registerAllSubscribers();
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start the application');
  process.exit(1);
});
