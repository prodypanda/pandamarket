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

import fs from 'fs';
import { getPool, query } from './db/pool';
import { getRedis, withRedisTimeout } from './db/redis';
import { imageVariantService } from './services/image-variant.service';

// Routers
import authRouter from './api/auth.route';
import storefrontAuthRouter from './api/storefront-auth.route';
import storefrontAccountRouter from './api/storefront-account.route';
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
import filesRouter, { mockFilesRouter } from './api/files.route';
import adminRouter from './api/admin.route';
import notificationRouter from './api/notification.route';
import creditsRouter from './api/credits.route';
import categoriesRouter from './api/categories.route';
import marketplaceRouter from './api/marketplace.route';
import vendorRouter from './api/vendor.route';
import shippingRouter from './api/shipping.route';
import themeRouter from './api/theme.route';
import { platformCmsRouter } from './api/platform-cms.route';
import pageBuilderRouter from './api/page-builder.route';
import reviewRouter from './api/review.route';
import wishlistRouter from './api/wishlist.route';
import addressRouter from './api/address.route';
import chatRouter from './api/chat.route';
import analyticsRouter from './api/analytics.route';
import emailTemplateRouter from './api/email-template.route';
import supportRouter from './api/support.route';
import adsRouter from './api/ads.route';
import cartRouter from './api/cart.route';
import buyerRouter from './api/buyer.route';
import { sellerRouter } from './api/seller.route';
import retentionRouter from './api/retention.route';
import { socketGateway } from './realtime/socket-gateway';
import { registerAllSubscribers } from './subscribers';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { startAiWorker } from './workers/ai.worker';
import { startEmailWorker } from './workers/email.worker';
import { startPayoutWorker } from './workers/payout.worker';
import { startSearchWorker } from './workers/search.worker';
import { startSubscriptionWorker } from './workers/subscription.worker';
import { startWebhookWorker } from './workers/webhook.worker';
import { startNotificationBatchWorker } from './workers/notification-batch.worker';
import { startDailyDigestWorker, scheduleDailyDigestCron } from './workers/daily-digest.worker';
import { startPaymentReconciliationWorker } from './workers/payment-reconciliation.worker';
import { startShipmentReconciliationWorker } from './workers/shipment-reconciliation.worker';
import { outboxWorker } from './workers/outbox.worker';
import { scheduleRecurringPayoutJobs } from './queues/payout-queue';
import { scheduleRecurringSubscriptionJobs } from './queues/subscription-queue';
import { schedulePaymentReconciliationSweep } from './queues/payment-reconciliation-queue';
import { scheduleShipmentReconciliationSweep } from './queues/shipment-reconciliation-queue';
import { adsService } from './services/ads.service';
import { adminNotesService } from './services/admin-notes.service';
import { notificationService } from './services/notification.service';

async function bootstrap() {
  // Initialise Sentry (no-op if DSN not configured)
  await initSentry();
  logMetricsStatus();

  // Validate DB connection (fatal — server can't run without DB)
  try {
    const dbPool = getPool();
    const client = await dbPool.connect();
    client.release();
    logger.info('Database connected successfully.');

    // Automatically apply any pending database migrations on startup
    try {
      const { run: runMigrations } = await import('./migrations/run');
      await runMigrations();
    } catch (migErr) {
      // Audit P2-18: a failed migration must not leave a half-migrated schema
      // serving traffic. Fail hard in production; keep dev resilient.
      if (config.env === 'production') {
        logger.error({ err: migErr }, 'Automatic migration failed — refusing to start in production.');
        process.exit(1);
      }
      logger.warn({ err: migErr }, 'Automatic migration runner encountered an issue during bootstrap, continuing server startup');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database.');
    process.exit(1);
  }

  // Validate Redis connection (non-fatal — server runs without workers/queues)
  try {
    const pingPromise = getRedis().ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timeout (5s)')), 5_000),
    );
    await Promise.race([pingPromise, timeoutPromise]);
    logger.info('Redis connected successfully.');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — background workers and queues will be disabled. Server will continue without them.');
  }

  const app = express();

  app.set('trust proxy', 1);

  // Audit P2-21: config-derived CSP sources can be empty, relative (S3 public
  // base URL defaults to a path), or localhost defaults — all invalid or wrong
  // in a production header. Filter them out instead of emitting broken CSP.
  const cspSource = (src: string | undefined): string | null => {
    if (!src) return null;
    if (/^https?:\/\//i.test(src)) {
      if (
        config.env === 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(src)
      ) {
        return null;
      }
      return src;
    }
    return null; // relative paths are not valid CSP sources
  };

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
            cspSource(config.s3.publicBaseUrl),
            '*.r2.cloudflarestorage.com',
            'https://picsum.photos',
          ].filter((s): s is string => Boolean(s)),
          connectSrc: [
            "'self'",
            cspSource(config.meili.host),
            cspSource(config.s3.endpoint),
            'https://developers.flouci.com',
            'https://api.konnect.network',
            'https://api.preprod.konnect.network',
          ].filter((s): s is string => Boolean(s)),
          frameSrc: ["'self'", 'https://flouci.com', 'https://pay.konnect.network'],
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

        // Allow localhost / 127.0.0.1 on any port — development only
        // (audit P2-14: production CORS previously accepted any localhost).
        if (
          config.env !== 'production' &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }

        // Platform domains. Audit P2-14: in production, drop the wildcard
        // *.vercel.app / *.onrender.com namespaces (anyone can register a
        // subdomain there); they remain available outside production.
        const platformHosts =
          config.env === 'production'
            ? '(pandamarket\\.tn|garbage\\.team)'
            : '(onrender\\.com|vercel\\.app|pandamarket\\.tn|garbage\\.team)';
        if (new RegExp(`^https?:\\/\\/[a-zA-Z0-9-.]*\\.${platformHosts}(:\\d+)?$`).test(origin)) {
          return callback(null, true);
        }

        // Check configured admin/store CORS lists
        if (
          allowed.includes(origin) ||
          allowed.some((a) => a !== '*' && origin.endsWith(a.replace(/^\*/, '')))
        ) {
          return callback(null, true);
        }

        // Return false to block CORS gracefully without throwing a 500 internal server error
        return callback(null, false);
      },
      credentials: true,
    }),
  );

  // Parsers
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        // Preserve the raw request body so webhook HMAC verification can be
        // computed over the exact bytes the provider signed.
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.cookieSecret));

  // Serve public uploads and themes statically from backend/data.
  // getDataDir() resolves correctly for both tsx dev mode (src/) and the
  // compiled production build (dist/backend/src/), unlike __dirname-relative paths.
  // Redirect legacy / storage URL patterns to local persistent file server
  app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
    const bucket = req.params.bucket;
    const fileKey = (req.params as Record<string, string>)[0] || '';
    res.redirect(`/${bucket}/${fileKey}`);
  });

  app.use('/pd-product-images', express.static(path.join(getDataDir(), 'pd-product-images')));
  app.use('/pd-themes', express.static(path.join(getDataDir(), 'pd-themes')));

  // Restore static image files from Supabase PostgreSQL database pd_file_blobs if missing on disk after a deploy,
  // or generate multi-size variants on-the-fly if requested variant is missing.
  app.use(['/pd-product-images', '/pd-themes'], async (req, res, next) => {
    try {
      const bucket = req.baseUrl.replace(/^\//, '');
      let cleanKey = req.path.replace(/^\//, '');
      if (cleanKey.startsWith(`${bucket}/`)) {
        cleanKey = cleanKey.substring(bucket.length + 1);
      }
      const key1 = `${bucket}/${cleanKey}`;
      const key2 = cleanKey;

      // 1. Try direct exact match in pd_file_blobs (with or without bucket prefix)
      const { rows } = await query<{ content_type: string; data: Buffer }>(
        'SELECT content_type, data FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
        [key1, key2],
      );

      if (rows.length > 0) {
        const filePath = path.join(getDataDir(), bucket, cleanKey);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, rows[0].data);
        res.setHeader('Content-Type', rows[0].content_type || 'image/jpeg');
        res.send(rows[0].data);
        return;
      }

      // 2. Try on-the-fly size variant generation if a preset suffix was requested
      const generated = await imageVariantService.getOrGenerateVariantOnTheFly(bucket, cleanKey);
      if (generated) {
        res.setHeader('Content-Type', generated.contentType);
        res.send(generated.buffer);
        return;
      }
    } catch {
      // Pass to next middleware / 404 handler
    }
    next();
  });

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
  apiRouter.use('/storefront/account', storefrontAccountRouter);
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
  apiRouter.use('/files', mockFilesRouter);
  apiRouter.use('/admin', adminRouter);
  apiRouter.use('/notifications', notificationRouter);
  apiRouter.use('/credits', creditsRouter);
  apiRouter.use('/categories', categoriesRouter);
  apiRouter.use('/marketplace', marketplaceRouter);
  apiRouter.use('/marketplace/cms', platformCmsRouter);
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
  apiRouter.use('/ads', adsRouter);
  apiRouter.use('/cart', cartRouter);
  apiRouter.use('/retention', retentionRouter);
  apiRouter.use('/buyer', buyerRouter);
  apiRouter.use('/seller', sellerRouter);

  app.use('/api/pd', apiRouter);

  // Swagger API documentation
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'PandaMarket API Documentation',
    }),
  );
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

    // Meilisearch — optional dependency (audit P2-13): search has a working
    // PostgreSQL fallback, so a missing/unconfigured Meili is 'degraded',
    // never a readiness failure. This also keeps /ready meaningful while
    // Meilisearch is intentionally unconfigured.
    try {
      const start = Date.now();
      const meiliRes = await fetch(`${config.meili.host}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      checks.meilisearch = meiliRes.ok
        ? { status: 'ok', latency_ms: Date.now() - start }
        : { status: 'degraded' };
    } catch {
      checks.meilisearch = { status: 'degraded' };
    }

    // MinIO / S3
    try {
      const start = Date.now();
      const s3Res = await fetch(`${config.s3.endpoint}/minio/health/live`, {
        signal: AbortSignal.timeout(5000),
      });
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
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${port} in ${config.env} mode.`);
  });

  // Keep-alive self-ping to avoid free-tier cold starts (Render sleeps web
  // services after ~15 minutes without inbound traffic). Pinging our own
  // public URL counts as inbound traffic and keeps the instance warm.
  // Configure with PD_KEEP_ALIVE_URL (or Render's auto-set RENDER_EXTERNAL_URL),
  // disable with PD_KEEP_ALIVE_ENABLED=false.
  const keepAliveUrl = process.env.PD_KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  const keepAliveEnabled = (process.env.PD_KEEP_ALIVE_ENABLED ?? 'true') !== 'false';
  if (keepAliveEnabled && keepAliveUrl && config.env === 'production') {
    const parsedInterval = Number(process.env.PD_KEEP_ALIVE_INTERVAL_MS);
    const keepAliveIntervalMs =
      Number.isFinite(parsedInterval) && parsedInterval >= 60_000 ? parsedInterval : 10 * 60 * 1000;
    const keepAliveTarget = `${keepAliveUrl.replace(/\/$/, '')}/health`;
    const keepAliveTimer = setInterval(() => {
      fetch(keepAliveTarget, { signal: AbortSignal.timeout(15000) })
        .then((res) => logger.debug({ status: res.status }, 'Keep-alive ping sent.'))
        .catch((err) => logger.warn({ err }, 'Keep-alive ping failed.'));
    }, keepAliveIntervalMs);
    keepAliveTimer.unref();
    logger.info(
      { target: keepAliveTarget, interval_ms: keepAliveIntervalMs },
      'Keep-alive self-ping enabled.',
    );
  }

  const adsLifecycleTimer = setInterval(
    () => {
      adsService
        .processLifecycle()
        .then((result) => {
          if (result.activated || result.completed || result.exhausted || result.charged)
            logger.info({ ads: result }, 'Ads lifecycle processed');
        })
        .catch((err) => logger.error({ err }, 'Ads lifecycle processing failed'));
    },
    5 * 60 * 1000,
  );
  adsLifecycleTimer.unref();
  void adsService
    .processLifecycle()
    .catch((err) => logger.error({ err }, 'Initial Ads lifecycle processing failed'));

  // Admin notes reminder scheduler — poll due reminders every 2 minutes
  // and emit in-app + realtime notifications for admins.
  //
  // Audit P2-17: dedupe moved from a process-local Set (clear()ed wholesale at
  // 1000 entries, causing already-handled reminders to re-fire) to Redis
  // SET-NX-EX keys with a 24h TTL. The sweep itself is now one JOIN query
  // instead of an N+1 per-admin loop.
  const REMINDER_DEDUPE_TTL_SECONDS = 24 * 60 * 60;
  const acquireReminderLock = async (adminId: string, noteId: string): Promise<boolean> => {
    try {
      const res = await withRedisTimeout(
        getRedis().set(`pd_note_reminder:${adminId}:${noteId}`, '1', 'EX', REMINDER_DEDUPE_TTL_SECONDS, 'NX'),
      );
      return res === 'OK';
    } catch {
      // Fail-open: Redis unavailable → still deliver the reminder (a duplicate
      // during an outage is preferable to silently dropping it).
      return true;
    }
  };
  const reminderTimer = setInterval(
    () => {
      (async () => {
        try {
          const due = await adminNotesService.fetchDueRemindersForAllAdmins(2 / 60);
          for (const note of due) {
            if (!(await acquireReminderLock(note.admin_id, note.id))) continue;
            await notificationService
              .create({
                user_id: note.admin_id,
                type: 'admin_note_reminder',
                title: 'Reminder due',
                message: note.title || 'A note reminder is due',
                data: { note_id: note.id, reminder_at: note.reminder_at },
              })
              .catch(() => undefined);
          }
        } catch (err) {
          logger.warn({ err }, 'Admin notes reminder sweep failed');
        }
      })();
    },
    2 * 60 * 1000,
  );
  reminderTimer.unref();

  // Attach WebSocket gateway for real-time notifications
  socketGateway.attach(server);

  // Register event subscribers (notifications, wallet credits, search sync, webhooks)
  registerAllSubscribers();

  // Start in-process background workers (BullMQ) if enabled
  if (config.runWorkersInProcess) {
    logger.info('🚀 Starting background workers (BullMQ) in-process...');
    try {
      const workers = [
        startAiWorker(),
        startEmailWorker(),
        startPayoutWorker(),
        startSearchWorker(),
        startSubscriptionWorker(),
        startWebhookWorker(),
        startNotificationBatchWorker(),
        startDailyDigestWorker(),
        startPaymentReconciliationWorker(),
        startShipmentReconciliationWorker(),
      ];

      const shutdownWorkers = async () => {
        logger.info('Shutting down in-process background workers...');
        outboxWorker.stop();
        await Promise.all(workers.map((w) => w.close().catch(() => {})));
      };

      // Audit P1-11: the outbox worker was fully built and tested but never
      // started, leaving every pd_outbox_event stuck in 'pending' forever.
      outboxWorker.start();

      process.on('SIGTERM', async () => {
        await shutdownWorkers();
      });
      process.on('SIGINT', async () => {
        await shutdownWorkers();
      });
      logger.info('🤖 All background workers successfully started in-process (10 BullMQ workers + outbox poller).');

      // Schedule recurring BullMQ jobs (idempotent — safe to call on every boot).
      // Non-blocking: don't let Redis queue scheduling hang the bootstrap.
      void Promise.all([
        scheduleRecurringPayoutJobs(),
        scheduleRecurringSubscriptionJobs(),
        scheduleDailyDigestCron(),
        schedulePaymentReconciliationSweep(),
        scheduleShipmentReconciliationSweep(),
      ])
        .then(() => logger.info('⏰ Recurring BullMQ jobs scheduled (payout, subscription, daily digest, payment and shipment reconciliation).'))
        .catch((err) => logger.error({ err }, 'Failed to schedule recurring BullMQ jobs.'));
    } catch (err) {
      logger.error({ err }, 'Failed to start background workers in-process.');
    }
  }
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start the application');
  process.exit(1);
});
