/**
 * Audit P2-22: fail-open Redis-backed rate-limit store built directly on the
 * shared ioredis connection.
 *
 * Why not `rate-limit-redis`: its constructor loads a Lua script immediately,
 * and any sendCommand error (Redis briefly unreachable at boot) escapes as an
 * uncaught TypeError that kills the process — observed in production
 * (deploy 6f11087, "unexpected reply from redis client").
 *
 * This implementation:
 * - performs NO Redis I/O at construction (module load is always safe);
 * - fails OPEN on every Redis path (`totalHits: 1` allows the request) so a
 *   Redis outage can never take down API traffic — matching the login-lockout
 *   fail-open precedent;
 * - uses fixed INCR/PTTL/PEXPIRE/DEL commands with no scripting.
 */

import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { getRedis } from '../db/redis';

export class FailOpenRedisStore implements Store {
  localKeys = true;
  prefix?: string;
  private windowMs = 60_000;

  constructor(prefix?: string) {
    this.prefix = prefix;
  }

  private key(key: string): string {
    return `${this.prefix ?? ''}${key}`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs ?? 60_000;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    try {
      const hits = await getRedis().get(this.key(key));
      if (hits === null) return undefined;
      const ttlMs = await getRedis().pttl(this.key(key));
      return { totalHits: Number(hits), resetTime: new Date(Date.now() + Math.max(ttlMs, 0)) };
    } catch {
      return undefined;
    }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const k = this.key(key);
    try {
      const results = (await getRedis()
        .multi()
        .incr(k)
        .pttl(k)
        .exec()) as Array<[null | Error, unknown]>;

      const totalHits = Number(results?.[0]?.[1] ?? 1);
      let pttl = Number(results?.[1]?.[1] ?? -2);

      // PTTL returns -2 when the key does not exist yet (race between INCR on
      // a fresh key) or -1 when it has no expiry. Set the window expiry.
      if (pttl < 0) {
        await getRedis().pexpire(k, this.windowMs);
        pttl = this.windowMs;
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(pttl, 0)),
      };
    } catch {
      // Fail-open: a hit count of 1 is always below every configured max.
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await getRedis().decr(this.key(key));
    } catch {
      // fail-open: nothing to do
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await getRedis().del(this.key(key));
    } catch {
      // fail-open
    }
  }

  async resetAll(): Promise<void> {
    try {
      const redis = getRedis();
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${this.prefix ?? ''}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== '0');
    } catch {
      // fail-open
    }
  }
}

export function redisRateLimitStore(prefix: string): Store {
  return new FailOpenRedisStore(prefix);
}
