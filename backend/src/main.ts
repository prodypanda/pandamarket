import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { logger } from './utils/logger';
import { accessLog, apiRateLimit, errorHandler, requestId } from './middlewares';

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
  app.use(helmet());
  app.use(
    cors({
      origin: [...config.adminCors, ...config.storeCors],
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
