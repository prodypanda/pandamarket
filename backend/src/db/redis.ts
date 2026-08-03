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

/**
 * Bound a Redis command so a degraded/disconnected Redis (which otherwise hangs
 * forever because `maxRetriesPerRequest: null` is required by BullMQ) rejects
 * quickly instead of wedging the caller. Use for all non-BullMQ Redis access.
 */
export function withRedisTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis operation timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
