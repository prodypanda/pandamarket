import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { getRedis } from '../db/redis';

const CACHE_KEY = 'pd:maintenance:config';
const CACHE_TTL_SECONDS = 15;
// Redis is configured with maxRetriesPerRequest: null (required by BullMQ), so
// commands can hang indefinitely when the connection is flaky. Bound every Redis
// call here so a degraded Redis never blocks the request pipeline. Kept tight
// (500ms) because while Redis is fully down each timeout is pure latency.
const REDIS_OP_TIMEOUT_MS = 500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis op timeout')), ms);
    promise
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

interface MaintenanceConfig {
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_illustration_url: string;
  maintenance_eta: string;
  maintenance_allowed_ips: string;
  maintenance_block_storefronts: boolean;
}

const MAINTENANCE_KEYS = [
  'maintenance_enabled',
  'maintenance_title',
  'maintenance_message',
  'maintenance_illustration_url',
  'maintenance_eta',
  'maintenance_allowed_ips',
  'maintenance_block_storefronts',
];

const DEFAULT_CONFIG: MaintenanceConfig = {
  maintenance_enabled: false,
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_illustration_url: '',
  maintenance_eta: '',
  maintenance_allowed_ips: '',
  maintenance_block_storefronts: false,
};

// In-process cache. With Redis down, every getMaintenanceConfig() otherwise
// paid two Redis timeouts plus a DB query on EVERY request, since this
// middleware runs on all non-bypassed routes. Admin maintenance updates call
// invalidateMaintenanceCache() which clears this, so a longer TTL is safe and
// keeps the dead-Redis reload penalty to at most once a minute.
let maintenanceMemoryCache: { config: MaintenanceConfig; expiresAt: number } | null = null;
const MAINTENANCE_MEMORY_TTL_MS = 60_000;

function rememberMaintenanceConfig(config: MaintenanceConfig) {
  maintenanceMemoryCache = { config, expiresAt: Date.now() + MAINTENANCE_MEMORY_TTL_MS };
}

async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  if (maintenanceMemoryCache && maintenanceMemoryCache.expiresAt > Date.now()) {
    return maintenanceMemoryCache.config;
  }

  try {
    const cached = await withTimeout(getRedis().get(CACHE_KEY), REDIS_OP_TIMEOUT_MS);
    if (cached) {
      const config = JSON.parse(cached) as MaintenanceConfig;
      rememberMaintenanceConfig(config);
      return config;
    }
  } catch {
    // Redis unavailable/slow — fall through to DB
  }

  const { rows } = await query<{ key: string; value: string }>(
    `SELECT key, value FROM pd_platform_config WHERE key = ANY($1::text[])`,
    [MAINTENANCE_KEYS],
  );

  const config: MaintenanceConfig = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    if (row.key === 'maintenance_enabled') config.maintenance_enabled = row.value === 'true';
    else if (row.key === 'maintenance_block_storefronts') config.maintenance_block_storefronts = row.value === 'true';
    else if (row.key in config) (config as unknown as Record<string, string | boolean>)[row.key] = row.value;
  }
  rememberMaintenanceConfig(config);

  try {
    await withTimeout(getRedis().setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(config)), REDIS_OP_TIMEOUT_MS);
  } catch {
    // Redis unavailable/slow — proceed without cache
  }

  return config;
}

export function getRequestIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const cfIp = req.headers['cf-connecting-ip'];
  const realIp = req.headers['x-real-ip'];
  const candidate = forwardedValue?.split(',')[0]?.trim()
    || (Array.isArray(cfIp) ? cfIp[0] : cfIp)
    || (Array.isArray(realIp) ? realIp[0] : realIp)
    || req.ip
    || '';
  return candidate.replace(/^::ffff:/, '');
}

export function isMaintenanceAllowedIp(clientIp: string | undefined, allowedIps: string): boolean {
  if (!clientIp || !allowedIps.trim()) return false;
  const normalizedClient = clientIp.replace(/^::ffff:/, '');
  const allowed = allowedIps.split(',').map((ip) => ip.trim()).filter(Boolean);
  return allowed.some((ip) => ip === normalizedClient || ip === clientIp);
}

function isStorefrontApiPath(path: string): boolean {
  return path.startsWith('/api/pd/stores/by-host/')
    || /^\/api\/pd\/stores\/[^/]+\/(homepage|pages|page-builder-preview)(?:\/|$)/.test(path)
    || path.startsWith('/api/pd/products/public')
    || path.startsWith('/api/pd/products/by-store/')
    || path.startsWith('/api/pd/categories')
    || path.startsWith('/api/pd/reviews/products/')
    || path.startsWith('/api/pd/storefront/')
    || path.startsWith('/api/pd/orders/storefront/')
    || path.startsWith('/api/pd/payments/storefront/');
}

const BYPASS_PATH_PREFIXES = [
  '/api/pd/admin/',
  '/api/pd/auth/',
  '/api/pd/marketplace/settings',
  '/api/pd/marketplace/maintenance',
  '/health',
  '/ready',
  '/metrics',
  '/api/docs',
];

export function maintenanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    if (BYPASS_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    let config: MaintenanceConfig;
    try {
      config = await getMaintenanceConfig();
    } catch {
      return next();
    }

    if (!config.maintenance_enabled) {
      return next();
    }

    if (!config.maintenance_block_storefronts && isStorefrontApiPath(path)) {
      return next();
    }

    const userRole = req.user?.role;
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    if (isMaintenanceAllowedIp(getRequestIp(req), config.maintenance_allowed_ips)) {
      return next();
    }

    res.status(503).json({
      error: {
        code: 'MAINTENANCE_MODE',
        title: config.maintenance_title,
        message: config.maintenance_message,
        illustration_url: config.maintenance_illustration_url || null,
        eta: config.maintenance_eta || null,
        block_storefronts: config.maintenance_block_storefronts,
      },
    });
  };
}

export function invalidateMaintenanceCache() {
  // Drop the in-process copy so the change is visible immediately.
  maintenanceMemoryCache = null;
  try {
    void withTimeout(getRedis().del(CACHE_KEY), REDIS_OP_TIMEOUT_MS).catch(() => {});
  } catch {
    // Ignore
  }
}
