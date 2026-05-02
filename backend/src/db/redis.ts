/**
 * Centralised Redis connection (used by BullMQ + sessions later).
 */

import IORedis, { Redis } from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    redis.on('connect', () => logger.info('Redis connected'));
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
