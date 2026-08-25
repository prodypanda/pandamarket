/**
 * Audit P2-22: shared Redis-backed rate-limit store.
 *
 * Limits survive restarts and are enforced across instances (an in-memory
 * store resets per process). Fail-open by design: if Redis is degraded,
 * sendCommand resolves empty and the limiter allows the request instead of
 * erroring every route — matching the login-lockout fail-open precedent.
 */

import { RedisStore } from 'rate-limit-redis';
import { getRedis, withRedisTimeout } from '../db/redis';

export function redisRateLimitStore(prefix: string) {
  return new RedisStore({
    prefix,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: async (...args: any[]) => {
      try {
        return (await withRedisTimeout(
          getRedis().call(...(args as [string, ...string[]])),
        )) as unknown as string[];
      } catch {
        // Fail-open: never let a Redis outage take down API traffic.
        return [] as unknown as string[];
      }
    },
  });
}
